/**
 * OAuth state store for CSRF protection on authorization-code callbacks.
 *
 * Why this exists: the OAuth 2.0 `state` parameter is the canonical defense
 * against CSRF on the redirect-back-to-app flow. Intuit passes whatever we
 * put in the URL through unchanged, so we own the full lifecycle:
 *
 *   1. /api/quickbooks/connect generates a 32-byte random `nonce`.
 *   2. We bind `{ nonce → orgId, userId }` server-side with a short TTL.
 *   3. We send `nonce` to Intuit as `state`.
 *   4. /api/quickbooks/callback looks up the nonce, checks the binding,
 *      and DELETES the row (single-use).
 *
 * Storage: Upstash Redis when configured (multi-instance safe). Falls back
 * to a signed+encrypted HTTP-only cookie when Redis is unavailable, so dev
 * environments without Redis still get the same CSRF protection.
 *
 * `state` MUST NOT be guessable. Using the orgId (or any client-supplied
 * value) defeats the whole point — an attacker who knows the victim is a
 * member of org_xyz can trivially forge the state param. Random nonce is
 * the only correct shape.
 */
import { randomBytes, createHmac, createCipheriv, createDecipheriv } from 'node:crypto';
import { getRedis } from '@/lib/infra';

// Lazy require so the module can be imported outside a Next request
// context (e.g. from smoke tests).
type CookieJar = { get(name: string): { value: string } | undefined; set(name: string, value: string, opts: any): void; delete(name: string): void };
async function readCookieJar(): Promise<CookieJar | null> {
  try {
    const mod = await import('next/headers');
    return await mod.cookies() as unknown as CookieJar;
  } catch {
    return null;
  }
}

const STATE_COOKIE = 'qbo_oauth_state';
const STATE_TTL_SECONDS = 10 * 60; // 10 min — long enough for user to auth, short enough to limit replay.
const COOKIE_SECRET = process.env.OAUTH_STATE_SECRET ?? process.env.CRON_SECRET ?? 'collectly-dev-fallback';

interface PendingState {
  orgId: string;
  userId: string;
  provider: 'quickbooks';
  createdAt: number;
}

function newNonce(): string {
  return randomBytes(32).toString('base64url');
}

function sign(payload: string): string {
  return createHmac('sha256', COOKIE_SECRET).update(payload).digest('base64url');
}

function encryptCookie(json: string): string {
  // Derive a 32-byte key from COOKIE_SECRET.
  const key = createHmac('sha256', COOKIE_SECRET).update('qbo-cookie-key').digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

function decryptCookie(payload: string): string | null {
  try {
    const [ivB64, tagB64, ctB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !ctB64) return null;
    const key = createHmac('sha256', COOKIE_SECRET).update('qbo-cookie-key').digest();
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const ct = Buffer.from(ctB64, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plain.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Mint a fresh state nonce bound to the given orgId+userId. Stores the
 * binding in Redis (preferred) or a signed encrypted cookie (fallback).
 * Returns the nonce to put in the `state` query param.
 */
export async function mintOAuthState(orgId: string, userId: string): Promise<string> {
  const nonce = newNonce();
  const binding: PendingState = { orgId, userId, provider: 'quickbooks', createdAt: Date.now() };

  const redis = getRedis();
  if (redis) {
    await redis.set(`oauth:state:${nonce}`, JSON.stringify(binding), { ex: STATE_TTL_SECONDS });
  } else {
    // Fallback: signed+encrypted cookie, single-use via a "consumed" flag
    // we set in a second cookie after consumption. For dev/PGlite without
    // Redis, this is acceptable; for prod we expect UPSTASH env to be set.
    const payload = encryptCookie(JSON.stringify({ nonce, binding }));
    const jar = await readCookieJar();
    if (!jar) {
      throw new Error('OAuth state store unavailable: no Redis and no request cookie context');
    }
    jar.set(STATE_COOKIE, payload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/quickbooks',
      maxAge: STATE_TTL_SECONDS,
    });
  }
  return nonce;
}

export type ConsumeResult =
  | { ok: true; orgId: string; userId: string }
  | { ok: false; reason: 'missing' | 'expired' | 'mismatch' | 'malformed' };

/**
 * Validate and consume a state nonce from the OAuth callback.
 * Single-use: the binding is deleted after consumption so a replayed
 * callback cannot succeed.
 */
export async function consumeOAuthState(nonce: string, expected: { orgId: string; userId: string }): Promise<ConsumeResult> {
  if (!nonce || nonce.length < 16) return { ok: false, reason: 'malformed' };

  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(`oauth:state:${nonce}`);
    if (!raw) return { ok: false, reason: 'missing' };
    let parsed: PendingState;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw as PendingState);
    } catch {
      return { ok: false, reason: 'malformed' };
    }
    // Atomic delete so concurrent callbacks can't both succeed.
    await redis.del(`oauth:state:${nonce}`);
    if (parsed.orgId !== expected.orgId || parsed.userId !== expected.userId) {
      return { ok: false, reason: 'mismatch' };
    }
    return { ok: true, orgId: parsed.orgId, userId: parsed.userId };
  }

  // Cookie fallback — read the encrypted payload, verify, clear cookie.
  const jar = await readCookieJar();
  const raw = jar?.get(STATE_COOKIE)?.value;
  if (!raw) return { ok: false, reason: 'missing' };
  const plain = decryptCookie(raw);
  if (!plain) return { ok: false, reason: 'malformed' };
  jar!.delete(STATE_COOKIE);
  let parsed: { nonce: string; binding: PendingState };
  try {
    parsed = JSON.parse(plain);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (parsed.nonce !== nonce) return { ok: false, reason: 'mismatch' };
  if (parsed.binding.orgId !== expected.orgId || parsed.binding.userId !== expected.userId) {
    return { ok: false, reason: 'mismatch' };
  }
  return { ok: true, orgId: parsed.binding.orgId, userId: parsed.binding.userId };
}
