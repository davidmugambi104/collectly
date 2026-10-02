/**
 * Pure helpers shared by the public lead-capture routes. Nothing here imports
 * anything, so the node test runner can load it (see lead-email.ts for why).
 */

/**
 * Honeypot. Every public form renders a text input named `website` that a
 * person never sees or fills. A bot that fills every field fills it too.
 * The route answers with a normal success so the bot learns nothing, and
 * stores and sends nothing.
 */
export function isHoneypotHit(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const v = (body as Record<string, unknown>).website;
  return typeof v === 'string' && v.trim().length > 0;
}

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

/** Plain shape check, stricter than `includes('@')`, and rejects header-injection characters. */
export function looksLikeEmail(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v.trim());
}

/**
 * What a visitor is told when the lead could be neither saved nor sent. Honest
 * on purpose: the form must never show success when nobody will see it.
 */
export const LEAD_FAILED_MESSAGE =
  'We could not save that just now. Please try again in a minute, or email hello@getcollectly.app.';

/**
 * Decide the HTTP outcome of a capture attempt. A lead counts as captured if
 * it was stored OR the founder was notified; only losing both is a failure.
 */
export function leadOutcome(r: { stored: boolean; notified: boolean }): { status: 200 | 503 } {
  return { status: r.stored || r.notified ? 200 : 503 };
}
