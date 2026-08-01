import { NextRequest, NextResponse } from 'next/server';
import { stripeConnectAuthUrl } from '@/lib/integrations/stripe-connect';
import { getAuth } from '@/lib/auth-helper';
import { mintOAuthState } from '@/lib/oauth-state';

/**
 * SECURITY (audit C-1 follow-up): this route used to accept `?orgId=` from
 * any unauthenticated caller and pass it straight through as the OAuth
 * `state`, exactly the same flaw already fixed for QuickBooks/Xero. Since
 * this route is on the Clerk-public allowlist (OAuth providers can't carry
 * Clerk cookies), a third party could hit it directly with a victim's orgId,
 * complete Stripe's OAuth as themselves, and have the callback bind their
 * own Stripe account to the victim's org — silently rerouting that org's
 * customer payment links to the attacker's Stripe account. We now derive
 * the org from the caller's own session and mint a server-side binding for
 * the state, so the state can never be forged.
 */
export async function GET(_req: NextRequest) {
  const session = await getAuth();
  const orgId = session?.orgId;
  const userId = session?.userId;
  if (!orgId || !userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!process.env.STRIPE_CONNECT_CLIENT_ID) {
    return NextResponse.json(
      {
        error: 'Stripe Connect not configured',
        hint: 'Set STRIPE_CONNECT_CLIENT_ID in .env.local (separate from STRIPE_SECRET_KEY — get it from your Stripe Connect platform settings)',
      },
      { status: 503 }
    );
  }

  try {
    const state = await mintOAuthState(orgId, userId, 'stripe');
    return NextResponse.redirect(stripeConnectAuthUrl(state));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
