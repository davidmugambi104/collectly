import { rateLimit, getIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { captureLead } from '@/lib/lead-capture';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { parseJsonBody } from '@/lib/parse-body';
import { isHoneypotHit, leadOutcome, LEAD_FAILED_MESSAGE } from '@/lib/lead-guard';

const body = z.object({
  email: z.string().email().max(254),
  name: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  currentTool: z.string().min(1).max(200),
  hoursPerWeek: z.string().min(1).max(50),
  frustration: z.string().min(1).max(4000),
  wouldSwitch: z.enum(['yes', 'no', 'maybe']),
  website: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const rl = await rateLimit(getIp(req), { max: 10, key: 'qualify' });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });

  await ensureBootstrapped();
  const parsed = await parseJsonBody(req, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  if (isHoneypotHit(data)) return NextResponse.json({ ok: true });

  const r = await captureLead(
    {
      email: data.email,
      name: data.name || '',
      company: data.company || '',
      country: '',
      teamSize: '',
      painPoint: `[ASYNC-QUALIFY] Currently using: ${data.currentTool}. Hours/week chasing payments: ${data.hoursPerWeek}. Would switch: ${data.wouldSwitch}.\n\n${data.frustration}`,
      source: 'async-qualify-form',
    },
    {
      type: 'async_qualify',
      email: data.email,
      name: data.name,
      company: data.company,
      meta: {
        currentTool: data.currentTool,
        hoursPerWeek: data.hoursPerWeek,
        wouldSwitch: data.wouldSwitch,
        frustration: data.frustration,
      },
    },
    { promote: true },
  );
  const { status } = leadOutcome(r);
  if (status !== 200) return NextResponse.json({ error: LEAD_FAILED_MESSAGE }, { status });
  return NextResponse.json({ ok: true, id: r.id });
}
