/**
 * Public unsubscribe endpoint. Two paths:
 *
 *   GET /api/unsubscribe?token=<base64-encoded-email>
 *   → renders a tiny HTML confirmation page, then on click of the
 *     "Yes, unsubscribe me" button does POST /api/unsubscribe.
 *
 *   POST /api/unsubscribe { token }
 *   → marks the email as unsubscribed (waitlist) and DND across any
 *     matching customers (for transactional dunning suppression).
 *
 * The token format is `base64url(email)` for now. This is NOT signed
 * (i.e. anyone who can guess an email can unsubscribe it). For a
 * production system, use HMAC-signed tokens. For a beta with low
 * volume, the trade-off is acceptable: an attacker can unsubscribe
 * arbitrary addresses (annoying) but cannot read or send anything
 * to them.
 *
 * The footer in every outreach email links here, so this is the
 * legal CAN-SPAM / UK PECR / AU Spam Act "real unsubscribe path".
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/db';

const bodySchema = z.object({ token: z.string().min(1) });

function decodeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    // basic email shape check
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(decoded)) return null;
    return decoded.toLowerCase().trim();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return new NextResponse('Missing token', { status: 400 });
  }
  const email = decodeToken(token);
  if (!email) {
    return new NextResponse('Invalid token', { status: 400 });
  }
  // Render a tiny confirmation page. CSP-safe, no external resources.
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Unsubscribe — Collectly</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 80px auto; padding: 0 24px; color: #16171c; }
  h1 { font-size: 24px; margin: 0 0 12px; }
  p { color: #6c6e76; line-height: 1.5; }
  button { background: #16171c; color: #fff; border: 0; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; }
  .email { font-family: monospace; background: #f5f5f7; padding: 2px 6px; border-radius: 4px; }
  .ok { color: #0a7c2f; }
</style>
</head>
<body>
<h1>Unsubscribe</h1>
<p>You're unsubscribing <span class="email">${escapeHtml(email)}</span> from Collectly marketing emails.</p>
<p>If you also want to stop receiving payment reminders for invoices you owe a Collectly-using business, click the button below — we'll mark your address as do-not-contact across all our customers.</p>
<form method="POST" action="/api/unsubscribe">
  <input type="hidden" name="token" value="${escapeHtml(token)}" />
  <label><input type="checkbox" name="includeDnd" value="1" /> Also stop dunning emails (invoices you owe)</label>
  <p style="margin-top:24px"><button type="submit">Confirm unsubscribe</button></p>
</form>
</body>
</html>`;
  return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function POST(req: NextRequest) {
  let token: string;
  let includeDnd = false;
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    token = String(form.get('token') ?? '');
    includeDnd = form.get('includeDnd') === '1';
  } else if (contentType.includes('application/json')) {
    const data = bodySchema.parse(await req.json());
    token = data.token;
  } else {
    // also support ?token=... for simple one-click links (one-click is
    // technically required by some anti-spam laws; Gmail's UI shows a
    // "click to confirm" pattern)
    const url = new URL(req.url);
    token = url.searchParams.get('token') ?? '';
    includeDnd = url.searchParams.get('includeDnd') === '1';
  }

  const email = decodeToken(token);
  if (!email) {
    return new NextResponse('Invalid token', { status: 400 });
  }

  const client = await pool().connect();
  try {
    const now = new Date();
    // 1. Mark the waitlist entry unsubscribed (if any)
    await client.query(
      `UPDATE waitlist SET unsubscribed_at = $1 WHERE email = $2 AND unsubscribed_at IS NULL`,
      [now, email]
    );
    // 2. Optionally mark all matching customers as DND (transactional
    // dunning emails only — the legal "transactional or relationship"
    // exception means we don't HAVE to, but it's good hygiene).
    let dndCount = 0;
    if (includeDnd) {
      const r = await client.query(
        `UPDATE customers SET dnd_at = $1, updated_at = $1 WHERE email = $2 AND dnd_at IS NULL`,
        [now, email]
      );
      dndCount = r.rowCount ?? 0;
    }
    return new NextResponse(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Unsubscribed</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;max-width:480px;margin:80px auto;padding:0 24px;color:#16171c}h1{font-size:24px;margin:0 0 12px}p{color:#6c6e76;line-height:1.5}.ok{color:#0a7c2f}</style></head>
<body><h1 class="ok">Unsubscribed ✓</h1>
<p><span class="email">${escapeHtml(email)}</span> has been removed from Collectly marketing emails.</p>
${includeDnd ? `<p>Also marked as do-not-contact on ${dndCount} customer record${dndCount === 1 ? '' : 's'}. You won't receive dunning emails from any Collectly-using business at this address.</p>` : ''}
<p>You can re-subscribe anytime by signing up again on getcollectly.app.</p>
</body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } finally {
    client.release();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[c];
  });
}
