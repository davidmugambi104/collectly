import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/infra';
import { stripeBillingStatus } from '@/lib/stripe-billing-config';
import { createPortalSession } from '@/lib/stripe-checkout';
import { appUrl, sameOrigin, requireSession, loadSub, respond } from '@/lib/billing-route-helpers';

/** Opens the Stripe Customer Portal (update payment method, see invoices, cancel). Needs an existing Stripe customer. */
export async function POST(req: NextRequest) {
  const back = `${appUrl()}/dashboard/billing`;
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad origin' }, { status: 403 });
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (stripeBillingStatus(process.env).mode === 'not_configured') {
    return respond(req, { error: 'Stripe billing is not configured.', status: 409, fallback: back });
  }
  const sub = await loadSub(session.orgId);
  if (!sub?.stripeCustomerId) return respond(req, { error: 'No card or bank billing on this account.', status: 409, fallback: back });
  const portal = await createPortalSession(getStripe(), sub.stripeCustomerId, back);
  return respond(req, { url: portal.url, fallback: back });
}
