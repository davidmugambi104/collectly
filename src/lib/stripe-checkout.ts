/**
 * Stripe calls for Mugavi's own subscription billing. The client is passed in, so tests
 * hand it one that points at a local stand-in. Relative imports only.
 */
import type Stripe from 'stripe';
import {
  buildCheckoutParams, extraBookPriceId, extraBooks, priceIdFor, PLAN_PRICE_ENV, CHECKOUT_PLANS,
  type CheckoutInput, type CheckoutPlan,
} from './stripe-billing-config.ts';

type Env = Record<string, string | undefined>;

export async function createPlanCheckout(stripe: Stripe, env: Env, input: CheckoutInput) {
  const params = buildCheckoutParams(input, env);
  return stripe.checkout.sessions.create(params);
}

export async function createPortalSession(stripe: Stripe, customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}

export type SyncResult =
  | { action: 'none'; reason: string }
  | { action: 'created' | 'updated' | 'removed'; quantity: number };

/**
 * Keeps the "extra client book" item on a Practice subscription equal to books minus the
 * included allowance. Safe to call repeatedly: it only talks to Stripe when the number differs.
 * Proration is Stripe's default (a mid-month change is credited or charged pro rata).
 */
export async function syncExtraBookQuantity(
  stripe: Stripe,
  env: Env,
  args: { stripeSubscriptionId: string; books: number },
): Promise<SyncResult> {
  const growthPrice = priceIdFor('growth', env);
  const extraPrice = extraBookPriceId(env);
  if (!growthPrice || !extraPrice) return { action: 'none', reason: 'price ids not configured' };
  const sub = await stripe.subscriptions.retrieve(args.stripeSubscriptionId);
  const items = sub.items.data;
  if (!items.some((i) => i.price.id === growthPrice)) return { action: 'none', reason: 'not a Practice subscription' };
  const want = extraBooks('growth', args.books);
  const item = items.find((i) => i.price.id === extraPrice);
  const have = item?.quantity ?? 0;
  if (want === have) return { action: 'none', reason: 'already in sync' };
  if (want === 0 && item) {
    await stripe.subscriptionItems.del(item.id, { proration_behavior: 'create_prorations' });
    return { action: 'removed', quantity: 0 };
  }
  if (item) {
    await stripe.subscriptionItems.update(item.id, { quantity: want, proration_behavior: 'create_prorations' });
    return { action: 'updated', quantity: want };
  }
  await stripe.subscriptionItems.create({ subscription: sub.id, price: extraPrice, quantity: want, proration_behavior: 'create_prorations' });
  return { action: 'created', quantity: want };
}

export function missingPriceEnv(env: Env): string[] {
  return CHECKOUT_PLANS.filter((p: CheckoutPlan) => !priceIdFor(p, env)).map((p) => PLAN_PRICE_ENV[p]);
}
