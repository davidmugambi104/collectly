import { NextRequest, NextResponse } from 'next/server';
import { stripeConnectExchangeCode, saveStripeConnectConnection } from '@/lib/integrations/stripe-connect';
import { getAuth } from '@/lib/auth-helper';
import { consumeOAuthState } from '@/lib/oauth-state';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // server-bound nonce (see oauth-state.ts)
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/integrations?err=stripe&reason=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.json({ error: 'missing code or state' }, { status: 400 });
  }

  // SECURITY (audit C-1 follow-up): never trust `state` as a raw orgId.
  // Consume the server-bound binding first; forged/stale/expired states
  // must not bind Stripe tokens to an org.
  const session = await getAuth();
  if (!session?.orgId || !session?.userId) {
    return NextResponse.redirect(new URL('/dashboard/integrations?err=stripe&reason=invalid_state', req.url));
  }
  const consumed = await consumeOAuthState(state, { orgId: session.orgId, userId: session.userId }, 'stripe');
  if (!consumed.ok) {
    return NextResponse.redirect(new URL(`/dashboard/integrations?err=stripe&reason=${encodeURIComponent(consumed.reason)}`, req.url));
  }

  try {
    const tokens = await stripeConnectExchangeCode(code);
    await saveStripeConnectConnection(consumed.orgId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      stripe_user_id: tokens.stripe_user_id,
      stripe_publishable_key: tokens.stripe_publishable_key,
      scope: tokens.scope,
    });
    return NextResponse.redirect(new URL(`/dashboard/integrations?ok=stripe`, req.url));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
