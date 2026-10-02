import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, getIp } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/infra';
import { captureLead } from '@/lib/lead-capture';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { parseJsonBody } from '@/lib/parse-body';
import { isHoneypotHit, leadOutcome, LEAD_FAILED_MESSAGE } from '@/lib/lead-guard';

const schema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(200),
  company: z.string().trim().min(1).max(200),
  country: z.string().max(100).optional(),
  tool: z.string().trim().min(1).max(200),
  ar: z.string().max(100).optional(),
  dso: z.string().max(100).optional(),
  topPain: z.string().trim().min(1).max(4000),
  website: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const rl = await rateLimit(getIp(req), { max: 5, key: 'ar-audit' });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  await ensureBootstrapped();
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  if (isHoneypotHit(data)) return NextResponse.json({ ok: true });

  // This route emails the address the visitor typed, so it can be pointed at
  // someone else's inbox. Cap that per address, not just per IP.
  const perEmail = await rateLimit(data.email.toLowerCase(), { max: 2, windowMs: 10 * 60_000, key: 'ar-audit-email' });
  if (!perEmail.allowed) {
    return NextResponse.json({ error: 'We already have your request. Check your inbox, or try again in a few minutes.' }, { status: 429 });
  }

  // Store it and email the founder. Either is enough to count the lead as
  // captured; losing both returns a 503 so the form does not claim success.
  const r = await captureLead(
    {
      email: data.email,
      name: data.name,
      company: data.company,
      country: data.country && data.country.length === 2 ? data.country.toUpperCase() : null,
      painPoint: `[AR-AUDIT] Tool: ${data.tool}, Monthly A/R: ${data.ar || 'n/a'}, DSO: ${data.dso || 'n/a'}, Country: ${data.country || 'n/a'}\n\n${data.topPain}`,
      source: 'ar-audit',
    },
    {
      type: 'ar_audit',
      email: data.email,
      name: data.name,
      company: data.company,
      meta: { country: data.country, tool: data.tool, monthlyAR: data.ar, dso: data.dso, topPain: data.topPain },
    },
    { promote: true },
  );
  const { status } = leadOutcome(r);
  if (status !== 200) return NextResponse.json({ error: LEAD_FAILED_MESSAGE }, { status });

  // Optional internal webhook. Bounded so a dead endpoint cannot hang the form.
  const notifyUrl = process.env.INTERNAL_LEAD_WEBHOOK_URL;
  if (notifyUrl) {
    await fetch(notifyUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'ar_audit_request', ...data, website: undefined, requestedAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  }

  // Confirmation to the requester. Failure is logged, never shown: the lead is already captured.
  try {
    await sendEmail({
      to: data.email,
      subject: 'We received your A/R audit request',
      html: [
        `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#16171c">`,
        `<h2 style="margin:0 0 8px;font-size:18px">Thanks, ${escapeHtml(data.name)}</h2>`,
        `<p style="margin:0 0 16px;font-size:14px;line-height:1.5">We received your A/R audit request for <strong>${escapeHtml(data.company)}</strong>. A real person will review it and reply within 24 hours with 3 specific fixes you can apply this week.</p>`,
        `<p style="margin:0 0 16px;font-size:14px;line-height:1.5">If you have questions, reply to this email or contact us at <a href="mailto:hello@getcollectly.app">hello@getcollectly.app</a>.</p>`,
        `<p style="margin:0;font-size:12px;color:#6c6e76">Mugavi · Built in Nairobi · Used globally</p>`,
        `</body></html>`,
      ].join('\n'),
    });
  } catch (e) {
    console.error('[ar-audit] confirmation email failed:', e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
