import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/infra';
import { stripeBillingStatus, isCheckoutPlan, isManualBilling } from '@/lib/stripe-billing-config';
import { createPlanCheckout } from '@/lib/stripe-checkout';
import { appUrl, sameOrigin, requireSession, loadSub, loadOwnerEmail, countBooks, respond } from '@/lib/billing-route-helpers';

/**
 * Starts Stripe Checkout for one of the three plans. Does nothing (409) until the Stripe
 * keys, webhook secret and price ids are all set, and never for an organization that is
 * billed by manual invoice.
 */
export async function POST(req: NextRequest) {
  const back = `${appUrl()}/dashboard/billing`;
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad origin' }, { status: 403 });
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const json = form ? null : await req.json().catch(() => null);
  const plan = String(form?.get('plan') ?? json?.plan ?? '');
  if (!isCheckoutPlan(plan)) return respond(req, { error: 'unknown plan', fallback: back });

  if (!stripeBillingStatus(process.env).checkoutReady) {
    return respond(req, { error: 'Card checkout is not switched on.', status: 409, fallback: `${back}?checkout=off` });
  }
  const sub = await loadSub(session.orgId);
  if (isManualBilling(sub)) {
    return respond(req, { error: 'This account is billed by manual invoice.', status: 409, fallback: `${back}?checkout=manual` });
  }
  const books = plan === 'growth' ? await countBooks(session.userId) : 0;
  const checkout = await createPlanCheckout(getStripe(), process.env, {
    orgId: session.orgId,
    plan,
    books,
    customerId: sub?.stripeCustomerId ?? null,
    customerEmail: sub?.stripeCustomerId ? null : await loadOwnerEmail(session.orgId),
    successUrl: `${back}?upgraded=1`,
    cancelUrl: `${back}?cancelled=1`,
  });
  return respond(req, { url: checkout.url ?? undefined, error: checkout.url ? undefined : 'no checkout url', fallback: back });
}
