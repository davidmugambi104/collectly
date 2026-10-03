import { test } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { processStripeWebhook, type SubStore, type EventStore, type SubRow, type SubPatch } from './stripe-webhook.ts';

const SECRET = 'whsec_test_dummy';
const ENV = { STRIPE_PRICE_STARTER: 'price_s', STRIPE_PRICE_PRACTICE: 'price_p', STRIPE_PRICE_SCALE: 'price_x', STRIPE_PRICE_EXTRA_BOOK: 'price_e' };
const signer = new Stripe('sk_test_dummy');

function memory(rows: SubRow[]) {
  const orgPlans: Record<string, string> = {};
  const patches: { id: string; patch: SubPatch }[] = [];
  const subs: SubStore = {
    async findByStripeSubscriptionId(id) { return rows.find((r) => r.stripeSubscriptionId === id) ?? null; },
    async findByOrgId(orgId) { return rows.find((r) => r.orgId === orgId) ?? null; },
    async update(id, patch) { patches.push({ id, patch }); Object.assign(rows.find((r) => r.id === id)!, patch); },
    async insert(row) { rows.push({ id: `row${rows.length + 1}`, stripeCustomerId: null, stripeSubscriptionId: null, ...row } as SubRow); },
    async setOrgPlan(orgId, plan) { orgPlans[orgId] = plan; },
  };
  const seen = new Set<string>();
  const events: EventStore = {
    async claim(id) { if (seen.has(id)) return false; seen.add(id); return true; },
    async release(id) { seen.delete(id); },
  };
  return { rows, subs, events, orgPlans, patches, seen };
}

function send(m: ReturnType<typeof memory>, evt: object, opts: { secret?: string; other?: (e: Stripe.Event) => Promise<void> } = {}) {
  const payload = JSON.stringify(evt);
  const sig = signer.webhooks.generateTestHeaderString({ payload, secret: opts.secret ?? SECRET });
  return processStripeWebhook({ rawBody: payload, signature: sig, secret: SECRET, events: m.events, subs: m.subs, env: ENV, handleOther: opts.other ?? (async () => {}) });
}

let n = 0;
const ev = (type: string, object: object, extra: object = {}) => ({ id: `evt_${++n}`, object: 'event', type, data: { object }, ...extra });
const checkout = (o: object = {}) => ({ id: 'cs_1', object: 'checkout.session', mode: 'subscription', payment_status: 'paid', customer: 'cus_1', subscription: 'sub_1', metadata: { orgId: 'org1', plan: 'growth' }, ...o });
const stripeSub = (o: object = {}) => ({
  id: 'sub_1', object: 'subscription', status: 'active', customer: 'cus_1', metadata: { orgId: 'org1' },
  current_period_start: 1_800_000_000, current_period_end: 1_802_592_000, cancel_at: null, cancel_at_period_end: false,
  items: { data: [{ price: { id: 'price_p' } }, { price: { id: 'price_e' } }] }, ...o,
});
const trialRow = (): SubRow => ({ id: 'r1', orgId: 'org1', plan: 'starter', status: 'trialing', stripeCustomerId: null, stripeSubscriptionId: null });
const manualRow = (): SubRow => ({ id: 'r1', orgId: 'org1', plan: 'growth', status: 'active', stripeCustomerId: null, stripeSubscriptionId: null });

test('signature: missing, wrong secret and tampered body are all rejected before any work', async () => {
  const m = memory([trialRow()]);
  const payload = JSON.stringify(ev('checkout.session.completed', checkout()));
  const base = { rawBody: payload, secret: SECRET, events: m.events, subs: m.subs, env: ENV, handleOther: async () => {} };
  assert.equal((await processStripeWebhook({ ...base, signature: null })).status, 400);
  assert.equal((await processStripeWebhook({ ...base, signature: 'nonsense' })).status, 400);
  const wrong = signer.webhooks.generateTestHeaderString({ payload, secret: 'whsec_other' });
  assert.equal((await processStripeWebhook({ ...base, signature: wrong })).status, 400);
  const good = signer.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  assert.equal((await processStripeWebhook({ ...base, rawBody: payload.replace('growth', 'scale'), signature: good })).status, 400);
  assert.equal((await processStripeWebhook({ ...base, signature: good, secret: undefined })).status, 400);
  assert.equal(m.seen.size, 0);
  assert.equal(m.patches.length, 0);
});

test('checkout.session.completed activates the subscription row and the org plan', async () => {
  const m = memory([trialRow()]);
  const r = await send(m, ev('checkout.session.completed', checkout()));
  assert.equal(r.status, 200);
  assert.deepEqual([m.rows[0].plan, m.rows[0].status, m.rows[0].stripeCustomerId, m.rows[0].stripeSubscriptionId], ['growth', 'active', 'cus_1', 'sub_1']);
  assert.equal(m.orgPlans.org1, 'growth');
});

test('checkout with no row yet inserts one', async () => {
  const m = memory([]);
  await send(m, ev('checkout.session.completed', checkout()));
  assert.equal(m.rows.length, 1);
  assert.equal(m.rows[0].status, 'active');
});

test('ACH: an unpaid checkout is incomplete until invoice.paid, and a late event does not regress an active row', async () => {
  const m = memory([trialRow()]);
  await send(m, ev('checkout.session.completed', checkout({ payment_status: 'unpaid' })));
  assert.equal(m.rows[0].status, 'incomplete');
  await send(m, ev('invoice.paid', { id: 'in_1', subscription: 'sub_1', lines: { data: [{ period: { end: 1_802_592_000 } }] } }));
  assert.equal(m.rows[0].status, 'active');
  await send(m, ev('checkout.session.completed', checkout({ payment_status: 'unpaid' })));
  assert.equal(m.rows[0].status, 'active');
});

test('idempotency: the same event id is processed once', async () => {
  const m = memory([trialRow()]);
  const e = ev('customer.subscription.updated', stripeSub({ status: 'past_due' }));
  const a = await send(m, e);
  const b = await send(m, e);
  assert.equal(a.body.deduped, undefined);
  assert.equal(b.body.deduped, true);
  assert.equal(m.patches.length, 1);
});

test('idempotency: a handler failure releases the id so Stripe retry is processed', async () => {
  const m = memory([trialRow()]);
  const e = ev('charge.refunded', { id: 'ch_1' });
  let fail = true;
  const other = async () => { if (fail) throw new Error('db down'); };
  assert.equal((await send(m, e, { other })).status, 500);
  fail = false;
  const again = await send(m, e, { other });
  assert.equal(again.status, 200);
  assert.equal(again.body.deduped, undefined);
});

test('manual billing is never overwritten by any subscription webhook', async () => {
  const m = memory([manualRow()]);
  const results = [
    await send(m, ev('checkout.session.completed', checkout())),
    await send(m, ev('customer.subscription.updated', stripeSub({ status: 'canceled' }))),
    await send(m, ev('customer.subscription.deleted', stripeSub())),
    await send(m, ev('invoice.payment_failed', { id: 'in_1', subscription: 'sub_1', subscription_details: { metadata: { orgId: 'org1' } } })),
    await send(m, ev('invoice.paid', { id: 'in_2', subscription: 'sub_1' })),
  ];
  for (const r of results) assert.equal(r.body.outcome, 'skipped');
  assert.equal(m.patches.length, 0);
  assert.deepEqual(m.rows[0], manualRow());
  assert.equal(m.orgPlans.org1, undefined);
});

test('a Stripe-subscription event matching only by org id cannot touch a manual row, even for another sub id', async () => {
  const m = memory([manualRow()]);
  const r = await send(m, ev('customer.subscription.updated', stripeSub({ id: 'sub_other' })));
  assert.equal(r.body.reason, 'manual_billing_protected');
});

test('subscription.updated sets status, dates, cancel date, and follows a plan change from the portal', async () => {
  const m = memory([{ ...trialRow(), status: 'active', plan: 'starter', stripeSubscriptionId: 'sub_1', stripeCustomerId: 'cus_1' }]);
  await send(m, ev('customer.subscription.updated', stripeSub({ cancel_at_period_end: true })));
  assert.equal(m.rows[0].plan, 'growth');
  assert.equal(m.orgPlans.org1, 'growth');
  const p = m.patches[0].patch;
  assert.equal(p.currentPeriodEnd?.getTime(), 1_802_592_000_000);
  assert.equal(p.cancelAt?.getTime(), 1_802_592_000_000);
});

test('subscription.deleted maps canceled to cancelled', async () => {
  const m = memory([{ ...trialRow(), status: 'active', stripeSubscriptionId: 'sub_1' }]);
  await send(m, ev('customer.subscription.deleted', stripeSub({ status: 'canceled' })));
  assert.equal(m.rows[0].status, 'cancelled');
});

test('a late event for an old subscription does not touch the new one', async () => {
  const m = memory([{ ...trialRow(), status: 'active', stripeSubscriptionId: 'sub_new' }]);
  const r = await send(m, ev('customer.subscription.deleted', stripeSub({ id: 'sub_old' })));
  assert.equal(r.body.reason, 'stale_subscription');
  assert.equal(m.rows[0].status, 'active');
});

test('invoice.payment_failed then invoice.paid moves active, past_due, active; cancelled stays cancelled', async () => {
  const m = memory([{ ...trialRow(), status: 'active', stripeSubscriptionId: 'sub_1' }]);
  await send(m, ev('invoice.payment_failed', { id: 'in_1', subscription: 'sub_1' }));
  assert.equal(m.rows[0].status, 'past_due');
  await send(m, ev('invoice.paid', { id: 'in_2', subscription: 'sub_1' }));
  assert.equal(m.rows[0].status, 'active');
  m.rows[0].status = 'cancelled';
  await send(m, ev('invoice.paid', { id: 'in_3', subscription: 'sub_1' }));
  assert.equal(m.rows[0].status, 'cancelled');
});

test('connected-account (Stripe Connect) events never touch Mugavi subscriptions', async () => {
  const m = memory([trialRow()]);
  const r = await send(m, ev('checkout.session.completed', checkout(), { account: 'acct_1' }));
  assert.equal(r.body.reason, 'connected_account_event');
  assert.equal(m.rows[0].status, 'trialing');
});

test('customer invoice payments (payment-mode checkout with invoiceId) go to the other handler', async () => {
  const m = memory([trialRow()]);
  const seen: string[] = [];
  await send(m, ev('checkout.session.completed', { id: 'cs_2', mode: 'payment', metadata: { invoiceId: 'inv_1' } }), { other: async (e) => { seen.push(e.type); } });
  assert.deepEqual(seen, ['checkout.session.completed']);
  assert.equal(m.patches.length, 0);
});
