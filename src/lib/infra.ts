import { Resend } from 'resend';
import { Twilio } from 'twilio';
import Stripe from 'stripe';
import { Redis } from '@upstash/redis';

let _resend: Resend | null = null;
let _twilio: Twilio | null = null;
let _stripe: Stripe | null = null;
let _redis: Redis | null = null;

/** Lazy Upstash Redis client. Returns null if env vars are missing. */
export function getRedis(): Redis | null {
  if (!_redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

export function getResend() { if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY); return _resend; }
export function getTwilio() {
  if (!_twilio && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    _twilio = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _twilio;
}
export function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'PLACEHOLDER_FROM_ENV', { apiVersion: '2025-02-24.acacia' });
  return _stripe;
}

// Backward-compatible exports (lazy getters)
export const resend = new Proxy({} as Resend, { get: (_t, p) => (getResend() as any)[p] });
export const twilio = new Proxy({} as Twilio, { get: (_t, p) => { const t = getTwilio(); return t ? (t as any)[p] : undefined; } });
export const stripe = new Proxy({} as Stripe, { get: (_t, p) => (getStripe() as any)[p] });
export const redis = new Proxy({} as Redis, { get: (_t, p) => { const r = getRedis(); return r ? (r as any)[p] : undefined; } });

// Where dunning replies should go. Zoho already holds MX for
// getcollectly.app (real business email), so a customer's reply lands
// there naturally — no dedicated receiving domain or address tricks
// needed. ZOHO_IMAP_USER doubles as both the Reply-To address and the
// mailbox src/lib/inbox-imap-poll.ts logs into to read replies; matching
// a reply back to its invoice is done via email thread headers
// (In-Reply-To/References against dunning_runs.external_message_id), not
// the address it was sent to. Falls back to RESEND_FROM_EMAIL if unset,
// which still delivers correctly via Zoho — it just means the poller
// needs to watch that mailbox instead.
export function getDunningReplyToAddress(): string | undefined {
  if (process.env.ZOHO_IMAP_USER) return process.env.ZOHO_IMAP_USER;
  return undefined;
}

// Resend's send response only returns their own internal `id` (a UUID) —
// NOT the RFC822 Message-ID header that ends up on the actual email
// (confirmed live: id "b6a95935-..." vs message_id
// "<0100019fbc69ae7f-...@email.amazonses.com>", built on SES under the
// hood). Fetching it costs one extra API call but that's the only way to
// get the value a reply's In-Reply-To header will reference.
export async function fetchResendMessageId(resendId: string): Promise<string | null> {
  if (!process.env.RESEND_API_KEY || resendId === 'dev-stub') return null;
  try {
    const res = await fetch(`https://api.resend.com/emails/${resendId}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.message_id ?? null;
  } catch (e) {
    console.error('[email] fetchResendMessageId failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function sendEmail(opts: { to: string; subject: string; html: string; from?: string; replyTo?: string; headers?: Record<string, string> }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY missing — skipping send');
    return { id: 'dev-stub', status: 'skipped' as const };
  }
  const { data, error } = await getResend().emails.send({
    // Prefer RESEND_FROM_EMAIL if it already contains a full "Name <email>"
    // formatted string (the most common Resend integration pattern). Fall
    // back to combining RESEND_FROM_NAME + RESEND_FROM_EMAIL. The previous
    // unconditional combination produced nested angle brackets when
    // RESEND_FROM_EMAIL was a full string, causing Resend to reject every
    // dunning email with "Invalid `from` field".
    from: opts.from ?? (process.env.RESEND_FROM_EMAIL && /<.*>/.test(process.env.RESEND_FROM_EMAIL)
      ? process.env.RESEND_FROM_EMAIL
      : `${process.env.RESEND_FROM_NAME ?? 'Collectly'} <${process.env.RESEND_FROM_EMAIL ?? 'hello@getcollectly.app'}>`),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo,
    headers: opts.headers,
  });
  // Resend returns { data, error } where error is non-null on failures
  // (sandbox restrictions, bad address, rate limit, etc.). We MUST surface
  // those to the caller; otherwise the dunning scheduler marks runs as
  // 'sent' when the email was never delivered — a silent lie to the user.
  if (error) {
    throw new Error(`resend: ${error.name ?? 'error'}: ${error.message}`);
  }
  return { id: data?.id, status: 'sent' as const };
}

export async function sendSms(opts: { to: string; body: string }) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
    // Symmetric with sendEmail's missing-key path. The dunning scheduler
    // (src/lib/dunning/scheduler.ts) checks status === 'skipped' to mark
    // a run as failed rather than 'sent' — otherwise the dashboard would
    // log an SMS as delivered when nothing left the box. Without this,
    // a missing Twilio config silently becomes a lie to the user.
    console.warn('[sms] twilio not configured — skipping send');
    return { sid: 'dev-stub', status: 'skipped' as const };
  }
  const client = getTwilio()!;
  // Twilio client.messages.create throws on transport errors but returns
  // { sid, error_code, error_message } on API errors. Surface both.
  const msg = await client.messages.create({ from: process.env.TWILIO_FROM_NUMBER, to: opts.to, body: opts.body });
  if ((msg as any).errorCode || (msg as any).errorMessage) {
    throw new Error(`twilio: ${(msg as any).errorCode ?? 'error'}: ${(msg as any).errorMessage}`);
  }
  return { sid: msg.sid, status: 'sent' as const };
}

/**
 * Build the unsubscribe URL token for a given email. Returns a base64url
 * encoding of the email — NOT signed. For production-grade anti-spoofing
 * we'd HMAC this with a server secret; for the current beta the
 * acceptable risk is that an attacker can unsubscribe arbitrary addresses
 * (annoying) but cannot read or send anything to them.
 */
export function unsubscribeToken(email: string): string {
  return Buffer.from(email.toLowerCase().trim(), 'utf8').toString('base64url');
}

/**
 * Append a CAN-SPAM/PECR-compliant unsubscribe footer to the bottom of
 * an HTML email body. Uses the email recipient as the unsubscribe target.
 */
export function withUnsubscribeFooter(html: string, email: string, appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcollectly.app'): string {
  const token = unsubscribeToken(email);
  const url = `${appUrl.replace(/\/$/, '')}/api/unsubscribe?token=${token}`;
  const footer = `
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px">
<p style="color:#6b7280;font-size:12px;line-height:1.5;margin:0 0 8px">
  You're receiving this because you signed up at getcollectly.app or are an existing customer.
</p>
<p style="color:#6b7280;font-size:12px;line-height:1.5;margin:0">
  <a href="${url}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a>
  &middot; <a href="${appUrl.replace(/\/$/, '')}/privacy" style="color:#6b7280;text-decoration:underline">Privacy</a>
  &middot; Collectly
</p>`;
  return html + footer;
}

/**
 * Build the RFC 8058 List-Unsubscribe headers for transactional dunning
 * emails. Different from the marketing footer — points to a per-customer
 * DND endpoint so clicking unsubscribes only THIS customer's dunning.
 */
export function dunningListUnsubscribeHeaders(customerEmail: string, appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcollectly.app'): Record<string, string> {
  const token = unsubscribeToken(customerEmail);
  const url = `${appUrl.replace(/\/$/, '')}/api/unsubscribe?token=${token}&includeDnd=1`;
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
