import { NextRequest, NextResponse } from 'next/server';
import { stripeConnectAuthUrl } from '@/lib/integrations/stripe-connect';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get('orgId');
  if (!orgId) {
    return NextResponse.json({ error: 'missing orgId' }, { status: 400 });
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
  return NextResponse.redirect(stripeConnectAuthUrl(orgId));
}
