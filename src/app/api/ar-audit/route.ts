import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getIp } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/infra';

export async function POST(req: NextRequest) {
  const rl = await rateLimit(getIp(req), { max: 5 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const body = await req.json();
    const { email, name, company, country, tool, ar, dso, topPain } = body;

    if (!email || !name || !company || !tool || !topPain) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload = {
      type: 'ar_audit_request',
      email,
      name,
      company,
      country,
      tool,
      ar,
      dso,
      topPain,
      requestedAt: new Date().toISOString(),
    };

    // Forward to an internal webhook if configured.
    const notifyUrl = process.env.INTERNAL_LEAD_WEBHOOK_URL;
    if (notifyUrl) {
      await fetch(notifyUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Non-blocking: don't fail the user if notification fails.
      });
    }

    // Email the founder/team so audit leads are actionable.
    try {
      const to = process.env.LEAD_NOTIFY_EMAIL ?? 'davie@getcollectly.app';
      await sendEmail({
        to,
        subject: `[A/R audit] ${company} — ${name}`,
        html: [
          `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#16171c">`,
          `<h2 style="margin:0 0 8px;font-size:18px">New A/R audit request</h2>`,
          `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;border:1px solid #eeeef0;border-radius:6px;overflow:hidden">`,
          `<tr><td style="padding:4px 8px;color:#6c6e76;font-size:12px">Name</td><td style="padding:4px 8px;font-size:12px">${escapeHtml(name)}</td></tr>`,
          `<tr><td style="padding:4px 8px;color:#6c6e76;font-size:12px">Email</td><td style="padding:4px 8px;font-size:12px"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>`,
          `<tr><td style="padding:4px 8px;color:#6c6e76;font-size:12px">Company</td><td style="padding:4px 8px;font-size:12px">${escapeHtml(company)}</td></tr>`,
          `<tr><td style="padding:4px 8px;color:#6c6e76;font-size:12px">Country</td><td style="padding:4px 8px;font-size:12px">${escapeHtml(country || 'n/a')}</td></tr>`,
          `<tr><td style="padding:4px 8px;color:#6c6e76;font-size:12px">Current tool</td><td style="padding:4px 8px;font-size:12px">${escapeHtml(tool)}</td></tr>`,
          `<tr><td style="padding:4px 8px;color:#6c6e76;font-size:12px">Monthly A/R</td><td style="padding:4px 8px;font-size:12px">${escapeHtml(ar || 'n/a')}</td></tr>`,
          `<tr><td style="padding:4px 8px;color:#6c6e76;font-size:12px">DSO</td><td style="padding:4px 8px;font-size:12px">${escapeHtml(dso || 'n/a')}</td></tr>`,
          `</table>`,
          `<p style="margin:0 0 8px;color:#6c6e76;font-size:12px"><strong>Top pain point:</strong></p>`,
          `<p style="margin:0 0 16px;padding:12px;background:#f7f7f8;border-radius:6px;font-size:13px;line-height:1.5">${escapeHtml(topPain).replace(/\n/g, '<br/>')}</p>`,
          `<p style="margin:0;font-size:12px"><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcollectly.app'}/dashboard">Open dashboard →</a></p>`,
          `</body></html>`,
        ].join('\n'),
      });
    } catch (e) {
      console.error('[ar-audit] email notification failed:', e instanceof Error ? e.message : e);
    }

    // Send a simple confirmation to the requester so they know it landed.
    try {
      await sendEmail({
        to: email,
        subject: 'We received your A/R audit request',
        html: [
          `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#16171c">`,
          `<h2 style="margin:0 0 8px;font-size:18px">Thanks, ${escapeHtml(name)}</h2>`,
          `<p style="margin:0 0 16px;font-size:14px;line-height:1.5">We received your A/R audit request for <strong>${escapeHtml(company)}</strong>. A real person will review it and reply within 24 hours with 3 specific fixes you can apply this week.</p>`,
          `<p style="margin:0 0 16px;font-size:14px;line-height:1.5">If you have questions, reply to this email or contact us at <a href="mailto:hello@getcollectly.app">hello@getcollectly.app</a>.</p>`,
          `<p style="margin:0;font-size:12px;color:#6c6e76">Collectly · Built in Nairobi · Used globally</p>`,
          `</body></html>`,
        ].join('\n'),
      });
    } catch (e) {
      console.error('[ar-audit] confirmation email failed:', e instanceof Error ? e.message : e);
    }

    return NextResponse.json({ ok: true });
  } catch  {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
