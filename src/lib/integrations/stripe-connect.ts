/**
 * Stripe Connect (Standard accounts) — OAuth 2.0 link flow.
 * Docs: https://stripe.com/docs/connect/oauth-standard-accounts
 *
 * Used to let a Collectly merchant link their own Stripe account so
 * Collectly can pull charges and payouts for cash-flow forecasting.
 */
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

const STRIPE_OAUTH = 'https://connect.stripe.com/oauth/authorize';
const STRIPE_TOKEN = 'https://connect.stripe.com/oauth/token';

export function stripeConnectAuthUrl(state: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.STRIPE_CONNECT_CLIENT_ID ?? '',
    scope: 'read_only',
    redirect_uri: process.env.STRIPE_CONNECT_REDIRECT_URI ?? '',
    state,
  });
  return `${STRIPE_OAUTH}?${params.toString()}`;
}

export async function stripeConnectExchangeCode(code: string) {
  const res = await fetch(STRIPE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID ?? '',
      client_secret: process.env.STRIPE_SECRET_KEY ?? '',
    }),
  });
  if (!res.ok) throw new Error(`Stripe Connect exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function saveStripeConnectConnection(orgId: string, tokens: {
  access_token: string;
  refresh_token: string;
  stripe_user_id: string;
  stripe_publishable_key?: string;
  scope?: string;
}) {
  const existing = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'stripe')))
    .limit(1);
  const meta = {
    stripe_user_id: tokens.stripe_user_id,
    stripe_publishable_key: tokens.stripe_publishable_key ?? null,
    scope: tokens.scope ?? null,
  };
  if (existing[0]) {
    await db
      .update(integrations)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        status: 'connected',
        metadata: meta,
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
      provider: 'stripe',
      status: 'connected',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      metadata: meta,
      lastSyncAt: new Date(),
    })
    .returning();
  return row.id;
}
