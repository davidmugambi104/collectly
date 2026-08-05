/**
 * Stripe Connect (Standard accounts) — OAuth 2.0 link flow.
 * Docs: https://stripe.com/docs/connect/oauth-standard-accounts
 *
 * Lets a Collectly merchant link their own Stripe account. Used for two
 * things:
 *  1. Routing customer invoice payments (the "Card"/"ACH" buttons on the
 *     payment portal, /api/payment/create-checkout) as DIRECT charges on
 *     the merchant's own connected account, so the money settles into
 *     their bank, not Collectly's.
 *  2. Pulling charges/payouts for cash-flow forecasting.
 *
 * Scope is `read_write`, not `read_only` — was `read_only` until this
 * fix, which meant Collectly could only ever look at a connected
 * account's existing history, never actually create a charge on their
 * behalf. Every payment collected through the portal was being charged
 * to Collectly's own STRIPE_SECRET_KEY account instead, with nothing
 * that forwarded it on to the actual business. `read_write` is required
 * for the platform API key to create Checkout Sessions/charges scoped to
 * the connected account via the `stripeAccount` request option (see
 * createConnectedCheckoutSession below and its use in
 * /api/payment/create-checkout).
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
    scope: 'read_write',
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

/** The connected Stripe account id (acct_...) to charge on behalf of, or
 * null if this org hasn't linked their own Stripe account yet. Used by
 * /api/payment/create-checkout to decide whether Card/ACH can be offered
 * at all — there is deliberately no fallback to charging Collectly's own
 * platform account, since that's the exact bug this exists to fix. */
export async function getConnectedStripeAccountId(orgId: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'stripe'), eq(integrations.status, 'connected')))
    .limit(1);
  const meta = row?.metadata as { stripe_user_id?: string } | null;
  return meta?.stripe_user_id ?? null;
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
