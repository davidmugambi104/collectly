import { NextRequest, NextResponse } from 'next/server';
import { stripeConnectExchangeCode, saveStripeConnectConnection } from '@/lib/integrations/stripe-connect';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // orgId
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/integrations?err=stripe&reason=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.json({ error: 'missing code or state' }, { status: 400 });
  }
  try {
    const tokens = await stripeConnectExchangeCode(code);
    await saveStripeConnectConnection(state, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      stripe_user_id: tokens.stripe_user_id,
      stripe_publishable_key: tokens.stripe_publishable_key,
      scope: tokens.scope,
    });
    return NextResponse.redirect(new URL(`/dashboard/integrations?ok=stripe`, req.url));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
