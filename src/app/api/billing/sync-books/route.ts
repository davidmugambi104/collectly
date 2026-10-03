import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/infra';
import { stripeBillingStatus } from '@/lib/stripe-billing-config';
import { syncExtraBookQuantity } from '@/lib/stripe-checkout';
import { appUrl, sameOrigin, requireSession, loadSub, countBooks, respond } from '@/lib/billing-route-helpers';

/** Brings the "extra client books" line on a Practice subscription up to the current book count. */
export async function POST(req: NextRequest) {
  const back = `${appUrl()}/dashboard/billing`;
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad origin' }, { status: 403 });
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!stripeBillingStatus(process.env).checkoutReady) return respond(req, { error: 'Stripe billing is not configured.', status: 409, fallback: back });
  const sub = await loadSub(session.orgId);
  if (!sub?.stripeSubscriptionId || sub.status === 'cancelled') return respond(req, { error: 'No card or bank subscription to update.', status: 409, fallback: back });
  const result = await syncExtraBookQuantity(getStripe(), process.env, {
    stripeSubscriptionId: sub.stripeSubscriptionId,
    books: await countBooks(session.userId),
  });
  if ((req.headers.get('accept') ?? '').includes('application/json')) return NextResponse.json(result);
  return NextResponse.redirect(`${back}?books=${result.action}`, 303);
}
