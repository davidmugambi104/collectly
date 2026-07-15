/**
 * Square OAuth 2.0 (with PKCE) — Authorization Code flow.
 * Docs: https://developer.squareup.com/docs/oauth-api/overview
 *
 * Square requires PKCE. We use the S256 method (challenge = base64url(sha256(verifier))).
 * The verifier is stored server-side keyed by the `state` parameter (orgId) so the
 * callback can look it up.
 */
import crypto from 'node:crypto';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

const SQUARE_OAUTH = 'https://connect.squareup.com/oauth2/authorize';
const SQUARE_TOKEN = 'https://connect.squareup.com/oauth2/token';
const SQUARE_SANDBOX_OAUTH = 'https://connect.squareupsandbox.com/oauth2/authorize';
const SQUARE_SANDBOX_TOKEN = 'https://connect.squareupsandbox.com/oauth2/token';

const SANDBOX = process.env.SQUARE_ENVIRONMENT === 'sandbox';

function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function squareAuthUrl(state: string) {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  // Stash verifier in a short-lived global keyed by state (orgId).
  // For prod: persist in DB with TTL. For dev: in-memory is fine.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  g.__squarePkce ??= new Map<string, { verifier: string; expires: number }>();
  g.__squarePkce.set(state, { verifier, expires: Date.now() + 10 * 60_000 });
  const params = new URLSearchParams({
    client_id: process.env.SQUARE_CLIENT_ID ?? '',
    scope: 'MERCHANT_PROFILE_READ ORDERS_READ ITEMS_READ PAYMENTS_READ',
    session: 'false',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: process.env.SQUARE_REDIRECT_URI ?? '',
  });
  return `${SANDBOX ? SQUARE_SANDBOX_OAUTH : SQUARE_OAUTH}?${params.toString()}`;
}

export function squareGetPkceVerifier(state: string): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  const entry = g.__squarePkce?.get(state);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    g.__squarePkce.delete(state);
    return null;
  }
  g.__squarePkce.delete(state);
  return entry.verifier;
}

export async function squareExchangeCode(code: string, verifier: string) {
  const res = await fetch(SANDBOX ? SQUARE_SANDBOX_TOKEN : SQUARE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Square-Version': '2024-10-17' },
    body: JSON.stringify({
      client_id: process.env.SQUARE_CLIENT_ID ?? '',
      client_secret: process.env.SQUARE_CLIENT_SECRET ?? '',
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: process.env.SQUARE_REDIRECT_URI ?? '',
    }),
  });
  if (!res.ok) throw new Error(`Square exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function saveSquareConnection(orgId: string, tokens: {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  merchant_id: string;
}) {
  const expiresAt = new Date(tokens.expires_at);
  const existing = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'square')))
    .limit(1);
  if (existing[0]) {
    await db
      .update(integrations)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        realmId: tokens.merchant_id,
        status: 'connected',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, existing[0].id));
    return existing[0].id;
  }
  const [row] = await db
    .insert(integrations)
    .values({
      id: nanoid(),
      orgId,
      provider: 'square',
      status: 'connected',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      realmId: tokens.merchant_id,
      lastSyncAt: new Date(),
    })
    .returning();
  return row.id;
}
