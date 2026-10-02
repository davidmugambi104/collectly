import { rateLimit, getIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { captureLead } from '@/lib/lead-capture';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { parseJsonBody } from '@/lib/parse-body';
import { isHoneypotHit, leadOutcome, LEAD_FAILED_MESSAGE } from '@/lib/lead-guard';

const body = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  country: z.string().min(2).max(100),
  teamSize: z.string().max(100),
  industry: z.string().max(200),
  dso: z.string().max(100),
  outstanding: z.string().max(100).optional(),
  tool: z.string().max(200).optional(),
  pain: z.string().min(1).max(4000),
  website: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const rl = await rateLimit(getIp(req), { max: 10, key: 'interview' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });

  await ensureBootstrapped();
  const parsed = await parseJsonBody(req, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  if (isHoneypotHit(data)) return NextResponse.json({ ok: true });

  // The waitlist.country column is varchar(2). The form sends a free-text
  // country, so an unsliced value made the insert throw and the lead was lost.
  const country = data.country.length === 2 ? data.country.toUpperCase() : null;
  const r = await captureLead(
    {
      email: data.email,
      name: data.name,
      company: data.company,
      country,
      teamSize: data.teamSize,
      painPoint: `[INTERVIEW] Industry: ${data.industry}, DSO: ${data.dso}, A/R: ${data.outstanding ?? '?'}, Tool: ${data.tool ?? '?'}\n\n${country ? '' : `[Country: ${data.country}] `}${data.pain}`,
      source: 'interview-form',
    },
    {
      type: 'interview',
      email: data.email,
      name: data.name,
      company: data.company,
      meta: {
        country: data.country,
        teamSize: data.teamSize,
        industry: data.industry,
        dso: data.dso,
        outstanding: data.outstanding,
        tool: data.tool,
        pain: data.pain,
      },
    },
    { promote: true },
  );
  const { status } = leadOutcome(r);
  if (status !== 200) return NextResponse.json({ error: LEAD_FAILED_MESSAGE }, { status });
  return NextResponse.json({ ok: true, id: r.id });
}
