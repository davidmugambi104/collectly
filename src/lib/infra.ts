import { Resend } from 'resend';
import { Twilio } from 'twilio';
import Stripe from 'stripe';

let _resend: Resend | null = null;
let _twilio: Twilio | null = null;
let _stripe: Stripe | null = null;

export function getResend() { if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY); return _resend; }
export function getTwilio() {
  if (!_twilio && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    _twilio = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _twilio;
}
export function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', { apiVersion: '2025-02-24.acacia' });
  return _stripe;
}

// Backward-compatible exports (lazy getters)
export const resend = new Proxy({} as Resend, { get: (_t, p) => (getResend() as any)[p] });
export const twilio = new Proxy({} as Twilio, { get: (_t, p) => { const t = getTwilio(); return t ? (t as any)[p] : undefined; } });
export const stripe = new Proxy({} as Stripe, { get: (_t, p) => (getStripe() as any)[p] });

export async function sendEmail(opts: { to: string; subject: string; html: string; from?: string; replyTo?: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY missing — skipping send');
    return { id: 'dev-stub', status: 'skipped' as const };
  }
  const { data, error } = await getResend().emails.send({
    from: opts.from ?? `${process.env.RESEND_FROM_NAME ?? 'Collectly'} <${process.env.RESEND_FROM_EMAIL ?? 'hello@getcollectly.app'}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo,
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
  const client = getTwilio();
  if (!client) { console.warn('[sms] twilio not configured — skipping send'); return { sid: 'dev-stub' }; }
  // Twilio client.messages.create throws on transport errors but returns
  // { sid, error_code, error_message } on API errors. Surface both.
  const msg = await client.messages.create({ from: process.env.TWILIO_FROM_NUMBER ?? '', to: opts.to, body: opts.body });
  if ((msg as any).errorCode || (msg as any).errorMessage) {
    throw new Error(`twilio: ${(msg as any).errorCode ?? 'error'}: ${(msg as any).errorMessage}`);
  }
  return msg;
}
