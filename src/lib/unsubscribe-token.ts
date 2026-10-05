import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Unsubscribe link tokens.
 *
 * New tokens are `base64url(email).<signature>` where the signature is a truncated HMAC of the
 * email, so nobody can unsubscribe an address they have not been mailed a link for.
 *
 * Two deliberate softnesses, because failing to honour a real opt-out is worse than a forged one:
 *  - Mail already sent carries the old unsigned `base64url(email)` token. It is still accepted
 *    unless UNSUBSCRIBE_REQUIRE_SIGNED=1 (set that once old mail has aged out, about 90 days).
 *  - With no secret configured, tokens stay unsigned rather than breaking every link.
 */
function key(env: Record<string, string | undefined>): string | null {
  const s = env.OAUTH_STATE_SECRET || env.CRON_SECRET;
  return s ? `unsubscribe-v1:${s}` : null;
}

const sig = (email: string, k: string) => createHmac('sha256', k).update(email).digest('base64url').slice(0, 22);
const normalise = (email: string) => email.toLowerCase().trim();
const looksLikeEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

export function makeUnsubscribeToken(email: string, env: Record<string, string | undefined> = process.env): string {
  const e = normalise(email);
  const body = Buffer.from(e, 'utf8').toString('base64url');
  const k = key(env);
  return k ? `${body}.${sig(e, k)}` : body;
}

/** The address a token names, or null when it is malformed or its signature is wrong. */
export function readUnsubscribeToken(token: string, env: Record<string, string | undefined> = process.env): string | null {
  try {
    const [body, given, ...rest] = token.split('.');
    if (!body || rest.length) return null;
    const email = normalise(Buffer.from(body, 'base64url').toString('utf8'));
    if (!looksLikeEmail(email)) return null;
    const k = key(env);
    if (given === undefined) {
      return k && env.UNSUBSCRIBE_REQUIRE_SIGNED === '1' ? null : email;
    }
    if (!k) return null;
    const want = Buffer.from(sig(email, k));
    const got = Buffer.from(given);
    return got.length === want.length && timingSafeEqual(got, want) ? email : null;
  } catch {
    return null;
  }
}
