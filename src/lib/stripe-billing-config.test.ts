import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stripeMode, stripeBillingStatus, buildCheckoutParams, automaticTaxEnabled, extraBooks, isManualBilling,
  billingState, paymentMethodOrder, planForPriceId, REQUIRED_STRIPE_ENV,
} from './stripe-billing-config.ts';
import { PLAN_PRICING } from './utils.ts';
import { configStatus } from './config-status.ts';

const FULL = {
  STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_WEBHOOK_SECRET: 'whsec_dummy',
  STRIPE_PRICE_STARTER: 'price_s', STRIPE_PRICE_PRACTICE: 'price_p', STRIPE_PRICE_SCALE: 'price_x', STRIPE_PRICE_EXTRA_BOOK: 'price_e',
};
const base = { orgId: 'org_1', successUrl: 'https://x/ok', cancelUrl: 'https://x/no' };

test('mode comes from the key prefix', () => {
  assert.equal(stripeMode({}), 'not_configured');
  assert.equal(stripeMode({ STRIPE_SECRET_KEY: 'sk_test_abc' }), 'test');
  assert.equal(stripeMode({ STRIPE_SECRET_KEY: 'sk_live_abc' }), 'live');
  assert.equal(stripeMode({ STRIPE_SECRET_KEY: 'PLACEHOLDER_FROM_ENV' }), 'not_configured');
});

test('status: key alone is not enough, every price id and the webhook secret are needed', () => {
  const s = stripeBillingStatus({ STRIPE_SECRET_KEY: 'sk_live_abc' });
  assert.equal(s.mode, 'live');
  assert.equal(s.checkoutReady, false);
  assert.ok(s.missing.includes('STRIPE_WEBHOOK_SECRET') && s.missing.includes('STRIPE_PRICE_EXTRA_BOOK'));
  assert.equal(stripeBillingStatus(FULL).checkoutReady, true);
  assert.equal(stripeBillingStatus({}).label, 'Stripe billing: not configured');
  assert.equal(stripeBillingStatus(FULL).label, 'Stripe billing: test mode');
  assert.equal(stripeBillingStatus({ ...FULL, STRIPE_SECRET_KEY: 'sk_live_x' }).label, 'Stripe billing: live');
});

test('status never contains a value', () => {
  const out = JSON.stringify(stripeBillingStatus({ ...FULL, STRIPE_SECRET_KEY: 'sk_test_SECRETVALUE', STRIPE_PRICE_PRACTICE: 'price_PRIVATE' }));
  assert.equal(out.includes('SECRETVALUE'), false);
  assert.equal(out.includes('price_PRIVATE'), false);
});

test('admin config lists the same env names', () => {
  const s = configStatus({}).find((x) => x.id === 'billing')!;
  assert.deepEqual(s.vars, [...REQUIRED_STRIPE_ENV]);
});

test('checkout params carry card AND us_bank_account', () => {
  for (const plan of ['starter', 'growth', 'scale'] as const) {
    const p = buildCheckoutParams({ ...base, plan, books: 1 }, FULL);
    assert.deepEqual([...p.payment_method_types].sort(), ['card', 'us_bank_account']);
    assert.equal(p.mode, 'subscription');
  }
});

test('ACH is listed first on the $399 and $999 plans, card first on $79', () => {
  assert.equal(paymentMethodOrder('growth')[0], 'us_bank_account');
  assert.equal(paymentMethodOrder('scale')[0], 'us_bank_account');
  assert.equal(paymentMethodOrder('starter')[0], 'card');
});

test('price ids come from env, never from PLAN_PRICING', () => {
  const p = buildCheckoutParams({ ...base, plan: 'growth', books: 1 }, FULL);
  assert.equal(p.line_items[0].price, 'price_p');
  assert.equal(JSON.stringify(p).includes('unit_amount'), false);
  assert.throws(() => buildCheckoutParams({ ...base, plan: 'scale', books: 1 }, { ...FULL, STRIPE_PRICE_SCALE: '' }), /STRIPE_PRICE_SCALE/);
});

test('extra books: a second line item only past the included allowance, Practice only', () => {
  const included = PLAN_PRICING.growth.includedOrgs as number;
  assert.equal(buildCheckoutParams({ ...base, plan: 'growth', books: included }, FULL).line_items.length, 1);
  const p = buildCheckoutParams({ ...base, plan: 'growth', books: included + 3 }, FULL);
  assert.deepEqual(p.line_items[1], { price: 'price_e', quantity: 3 });
  assert.equal(buildCheckoutParams({ ...base, plan: 'scale', books: 40 }, FULL).line_items.length, 1);
  assert.equal(extraBooks('starter', 50), 0);
  assert.equal(extraBooks('growth', included + 1), 1);
});

test('tax flag defaults off and turns on only with 1 or true', () => {
  assert.equal(automaticTaxEnabled({}), false);
  assert.equal(automaticTaxEnabled({ STRIPE_AUTOMATIC_TAX: '0' }), false);
  assert.equal(automaticTaxEnabled({ STRIPE_AUTOMATIC_TAX: 'yes' }), false);
  const off = buildCheckoutParams({ ...base, plan: 'starter', books: 1 }, FULL);
  assert.equal('automatic_tax' in off, false);
  const on = buildCheckoutParams({ ...base, plan: 'starter', books: 1 }, { ...FULL, STRIPE_AUTOMATIC_TAX: '1' }) as Record<string, unknown>;
  assert.deepEqual(on.automatic_tax, { enabled: true });
  assert.equal(on.billing_address_collection, 'required');
});

test('existing Stripe customer is reused, otherwise the email is passed', () => {
  const a = buildCheckoutParams({ ...base, plan: 'starter', books: 1, customerId: 'cus_1', customerEmail: 'x' }, FULL) as Record<string, unknown>;
  assert.equal(a.customer, 'cus_1');
  assert.equal('customer_email' in a, false);
});

test('manual billing: active or past_due without a Stripe subscription', () => {
  assert.equal(isManualBilling({ plan: 'growth', status: 'active', stripeSubscriptionId: null }), true);
  assert.equal(isManualBilling({ plan: 'growth', status: 'active', stripeSubscriptionId: 'sub_1' }), false);
  assert.equal(isManualBilling({ plan: 'growth', status: 'trialing', stripeSubscriptionId: null }), false);
  assert.equal(billingState({ plan: 'growth', status: 'active', stripeSubscriptionId: null }), 'manual');
  assert.equal(billingState({ plan: 'growth', status: 'trialing', stripeSubscriptionId: null }), 'trial');
});

test('planForPriceId maps back', () => {
  assert.equal(planForPriceId('price_p', FULL), 'growth');
  assert.equal(planForPriceId('price_nope', FULL), null);
});
