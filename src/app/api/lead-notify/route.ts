import { rateLimit, getIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/infra';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const schema = z.object({
  type: z.enum(['waitlist', 'interview', 'dunning_test']),
  email: z.string().email(),
  name: z.string().optional(),
  company: z.string().optional(),
  meta: z.record(z.any()).optional(),
});

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3030';

export async function POST(req: NextRequest) {
  const rl = rateLimit(getIp(req), { max: 10 });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });

  await ensureBootstrapped();
  const data = schema.parse(await req.json());
  const subject =
    data.type === 'waitlist' ? `🌱 New waitlist signup — ${data.email}` :
    data.type === 'interview' ? `🎯 New interview — ${data.email} (${data.company ?? 'n/a'})` :
    `🧪 Dunning test from ${data.email}`;

  const metaRows = data.meta
    ? Object.entries(data.meta).map(([k, v]) => `<tr><td style="padding:4px 8px;color:#6c6e76;font-size:12px">${k}</td><td style="padding:4px 8px;font-family:monospace;font-size:12px">${String(v).replace(/</g, '&lt;')}</td></tr>`).join('')
    : '';

  const html = `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#16171c">
<h2 style="margin:0 0 8px;font-size:18px">${subject}</h2>
<p style="margin:0 0 16px;color:#6c6e76;font-size:13px">Type: <b>${data.type}</b> · Source: Collectly</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 16px;border:1px solid #eeeef0;border-radius:6px;overflow:hidden">
  <tr><td style="padding:4px 8px;color:#6c6e76;font-size:12px">Email</td><td style="padding:4px 8px;font-family:monospace;font-size:12px">${data.email}</td></tr>
  ${data.name ? `<tr><td style="padding:4px 8px;color:#6c6e76;font-size:12px">Name</td><td style="padding:4px 8px;font-family:monospace;font-size:12px">${data.name}</td></tr>` : ''}
  ${data.company ? `<tr><td style="padding:4px 8px;color:#6c6e76;font-size:12px">Company</td><td style="padding:4px 8px;font-family:monospace;font-size:12px">${data.company}</td></tr>` : ''}
  ${metaRows}
</table>
<p style="margin:0;font-size:12px"><a href="${DASHBOARD_URL}/dashboard">Open dashboard →</a></p>
</body></html>`;

  try {
    const to = process.env.LEAD_NOTIFY_EMAIL ?? 'davie@getcollectly.app';
    const result = await sendEmail({ to, subject, html });
    return NextResponse.json({ ok: true, sent: result });
  } catch (e: any) {
    // Don't fail the user's submission just because notification failed
    console.error('Lead notify failed:', e?.message);
    return NextResponse.json({ ok: true, notified: false, error: String(e?.message) });
  }
}
