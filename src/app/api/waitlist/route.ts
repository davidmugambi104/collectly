import { rateLimit, getIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { captureLead } from '@/lib/lead-capture';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { parseJsonBody } from '@/lib/parse-body';
import { isHoneypotHit, leadOutcome, LEAD_FAILED_MESSAGE } from '@/lib/lead-guard';

const schema = z.object({
  email: z.string().email().max(254),
  name: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  country: z.string().length(2).optional(),
  teamSize: z.string().max(100).optional(),
  painPoint: z.string().max(4000).optional(),
  source: z.string().max(100).optional(),
  referrer: z.string().max(500).optional(),
  website: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const rl = await rateLimit(getIp(req), { max: 10, key: 'waitlist' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });

  await ensureBootstrapped();
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const { website, ...data } = parsed.data;
  if (isHoneypotHit({ website })) return NextResponse.json({ ok: true, created: false });

  const r = await captureLead(
    { ...data, source: data.source ?? 'waitlist' },
    {
      type: 'waitlist',
      email: data.email,
      name: data.name,
      company: data.company,
      meta: { country: data.country, teamSize: data.teamSize, source: data.source, details: data.painPoint },
    },
  );
  const { status } = leadOutcome(r);
  if (status !== 200) return NextResponse.json({ error: LEAD_FAILED_MESSAGE }, { status });
  return NextResponse.json({ ok: true, created: r.created });
}
