/**
 * Pure configuration for Mugavi's OWN subscription billing (not Stripe Connect and not
 * the customer-payment portal). Reads an env object passed in, never process.env, and
 * never returns a value: only names, booleans and the key mode. Relative imports only
 * so node --test can load it.
 */
import { PLAN_PRICING } from './utils.ts';

export type CheckoutPlan = 'starter' | 'growth' | 'scale';
export const CHECKOUT_PLANS: CheckoutPlan[] = ['starter', 'growth', 'scale'];

/** Env var that holds the Stripe price id for each plan. Price ids are never hardcoded. */
export const PLAN_PRICE_ENV: Record<CheckoutPlan, string> = {
  starter: 'STRIPE_PRICE_STARTER',
  growth: 'STRIPE_PRICE_PRACTICE',
  scale: 'STRIPE_PRICE_SCALE',
};
/** Per-unit price for each client book past the Practice allowance. */
export const EXTRA_BOOK_PRICE_ENV = 'STRIPE_PRICE_EXTRA_BOOK';

/** Needed before checkout can be offered. Names only. */
export const REQUIRED_STRIPE_ENV = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  PLAN_PRICE_ENV.starter,
  PLAN_PRICE_ENV.growth,
  PLAN_PRICE_ENV.scale,
  EXTRA_BOOK_PRICE_ENV,
] as const;

/** Optional switches. Names only. */
export const OPTIONAL_STRIPE_ENV = [
  { name: 'STRIPE_AUTOMATIC_TAX', note: 'Set to 1 to turn on Stripe Tax at checkout. Default off.' },
  { name: 'STRIPE_API_BASE', note: 'Tests only: points the SDK at a local stand-in. Leave unset.' },
] as const;

export type StripeMode = 'not_configured' | 'test' | 'live';

const set = (v: string | undefined) => !!v && v.trim() !== '';

export function stripeMode(env: Record<string, string | undefined>): StripeMode {
  const k = (env.STRIPE_SECRET_KEY ?? '').trim();
  if (/^(sk|rk)_test_/.test(k)) return 'test';
  if (/^(sk|rk)_live_/.test(k)) return 'live';
  return 'not_configured';
}

export function automaticTaxEnabled(env: Record<string, string | undefined>): boolean {
  const v = (env.STRIPE_AUTOMATIC_TAX ?? '').trim().toLowerCase();
  return v === '1' || v === 'true';
}

export type StripeBillingStatus = {
  mode: StripeMode;
  label: string;
  /** True only when key, webhook secret and every price id are set: checkout may be offered. */
  checkoutReady: boolean;
  missing: string[];
  required: string[];
  optional: { name: string; note: string; set: boolean }[];
  automaticTax: boolean;
};

export function stripeBillingStatus(env: Record<string, string | undefined>): StripeBillingStatus {
  const mode = stripeMode(env);
  const missing = REQUIRED_STRIPE_ENV.filter((n) => !set(env[n]));
  // A key that is set but is not a recognisable sk_/rk_ key does not count as configured.
  if (mode === 'not_configured' && set(env.STRIPE_SECRET_KEY) && !missing.includes('STRIPE_SECRET_KEY')) missing.unshift('STRIPE_SECRET_KEY');
  const label = mode === 'not_configured' ? 'Stripe billing: not configured' : mode === 'test' ? 'Stripe billing: test mode' : 'Stripe billing: live';
  return {
    mode,
    label,
    checkoutReady: mode !== 'not_configured' && missing.length === 0,
    missing,
    required: [...REQUIRED_STRIPE_ENV],
    optional: OPTIONAL_STRIPE_ENV.map((o) => ({ ...o, set: set(env[o.name]) })),
    automaticTax: automaticTaxEnabled(env),
  };
}

export function priceIdFor(plan: CheckoutPlan, env: Record<string, string | undefined>): string | null {
  const v = env[PLAN_PRICE_ENV[plan]];
  return set(v) ? v!.trim() : null;
}

export function extraBookPriceId(env: Record<string, string | undefined>): string | null {
  const v = env[EXTRA_BOOK_PRICE_ENV];
  return set(v) ? v!.trim() : null;
}

/** Reverse lookup, so a plan change made in the Customer Portal maps back to our plan key. */
export function planForPriceId(priceId: string, env: Record<string, string | undefined>): CheckoutPlan | null {
  for (const p of CHECKOUT_PLANS) if (priceIdFor(p, env) === priceId) return p;
  return null;
}

export function isCheckoutPlan(p: unknown): p is CheckoutPlan {
  return typeof p === 'string' && (CHECKOUT_PLANS as string[]).includes(p);
}

/** Client books past the Practice allowance. Zero for every other plan. */
export function extraBooks(plan: string, books: number): number {
  if (plan !== 'growth') return 0;
  const included = PLAN_PRICING.growth.includedOrgs;
  if (typeof included !== 'number') return 0;
  return Math.max(0, Math.floor(books) - included);
}

export type SubRowLike = { plan: string; status: string; stripeSubscriptionId: string | null };

/**
 * A row billed by hand: active (or past due) with no Stripe subscription behind it.
 * Webhooks must never change these, and checkout is not offered to them.
 */
export function isManualBilling(sub: SubRowLike | null | undefined): boolean {
  return !!sub && !sub.stripeSubscriptionId && (sub.status === 'active' || sub.status === 'past_due');
}

export function billingState(sub: SubRowLike | null | undefined): 'manual' | 'stripe' | 'trial' | 'none' {
  if (!sub) return 'none';
  if (isManualBilling(sub)) return 'manual';
  if (sub.stripeSubscriptionId) return 'stripe';
  return sub.status === 'trialing' ? 'trial' : 'none';
}

/** ACH first on the $399 and $999 plans, where card fees are largest; card first on the $79 plan. */
export function paymentMethodOrder(plan: CheckoutPlan): ('card' | 'us_bank_account')[] {
  return PLAN_PRICING[plan].monthly >= 399 ? ['us_bank_account', 'card'] : ['card', 'us_bank_account'];
}

export type CheckoutInput = {
  orgId: string;
  plan: CheckoutPlan;
  books: number;
  successUrl: string;
  cancelUrl: string;
  customerId?: string | null;
  customerEmail?: string | null;
};

/** Builds the Stripe Checkout Session params. Throws when a needed price id is not configured. */
export function buildCheckoutParams(input: CheckoutInput, env: Record<string, string | undefined>) {
  const price = priceIdFor(input.plan, env);
  if (!price) throw new Error(`${PLAN_PRICE_ENV[input.plan]} is not set`);
  const line_items: { price: string; quantity: number }[] = [{ price, quantity: 1 }];
  const extra = extraBooks(input.plan, input.books);
  if (extra > 0) {
    const extraPrice = extraBookPriceId(env);
    if (!extraPrice) throw new Error(`${EXTRA_BOOK_PRICE_ENV} is not set`);
    line_items.push({ price: extraPrice, quantity: extra });
  }
  const tax = automaticTaxEnabled(env);
  const meta = { orgId: input.orgId, plan: input.plan };
  return {
    mode: 'subscription' as const,
    line_items,
    payment_method_types: paymentMethodOrder(input.plan),
    payment_method_options: {
      us_bank_account: {
        verification_method: 'automatic' as const,
        financial_connections: { permissions: ['payment_method' as const] },
      },
    },
    client_reference_id: input.orgId,
    metadata: meta,
    subscription_data: { metadata: meta },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    ...(input.customerId ? { customer: input.customerId } : input.customerEmail ? { customer_email: input.customerEmail } : {}),
    // Stripe Tax: off unless STRIPE_AUTOMATIC_TAX is set. It needs an address to work.
    ...(tax
      ? {
          automatic_tax: { enabled: true },
          billing_address_collection: 'required' as const,
          tax_id_collection: { enabled: true },
          ...(input.customerId ? { customer_update: { address: 'auto' as const, name: 'auto' as const } } : {}),
        }
      : {}),
  };
}
