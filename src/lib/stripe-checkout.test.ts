import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { makeStripe } from './stripe-client.ts';
import { createPlanCheckout, createPortalSession, syncExtraBookQuantity } from './stripe-checkout.ts';

/**
 * A local stand-in for the Stripe API. Records every request (form-decoded) and answers
 * just enough for the calls under test. Real Stripe is never contacted: the client is
 * pointed here with STRIPE_API_BASE and the key is a dummy.
 */
type Call = { method: string; path: string; form: Record<string, string> };
const calls: Call[] = [];
let server: http.Server;
let base = '';
let subItems: { id: string; quantity: number; price: { id: string } }[] = [];

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const form = Object.fromEntries(new URLSearchParams(body));
      calls.push({ method: req.method!, path: req.url!.split('?')[0], form });
      const send = (o: object) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
      const p = req.url!.split('?')[0];
      if (p === '/v1/checkout/sessions') return send({ id: 'cs_standin', object: 'checkout.session', url: 'https://standin.invalid/pay' });
      if (p === '/v1/billing_portal/sessions') return send({ id: 'bps_1', object: 'billing_portal.session', url: 'https://standin.invalid/portal' });
      if (p === '/v1/subscriptions/sub_1') return send({ id: 'sub_1', object: 'subscription', items: { object: 'list', data: subItems } });
      if (p === '/v1/subscription_items' && req.method === 'POST') return send({ id: 'si_new', object: 'subscription_item' });
      if (p.startsWith('/v1/subscription_items/')) return send({ id: p.split('/').pop(), object: 'subscription_item', deleted: true });
      res.statusCode = 404; send({ error: { message: 'no such stand-in route' } });
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => { server.close(); });

const ENV = () => ({
  STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_API_BASE: base,
  STRIPE_PRICE_STARTER: 'price_s', STRIPE_PRICE_PRACTICE: 'price_p', STRIPE_PRICE_SCALE: 'price_x', STRIPE_PRICE_EXTRA_BOOK: 'price_e',
});
const input = { orgId: 'org1', successUrl: 'https://x/ok', cancelUrl: 'https://x/no' };

test('Practice checkout sends card and bank, price ids from env, extra books as a second item, no tax by default', async () => {
  calls.length = 0;
  const env = ENV();
  const session = await createPlanCheckout(makeStripe(env), env, { ...input, plan: 'growth', books: 13, customerEmail: 'owner-id@example.invalid' });
  assert.equal(session.url, 'https://standin.invalid/pay');
  const f = calls[0].form;
  assert.equal(f['mode'], 'subscription');
  assert.equal(f['payment_method_types[0]'], 'us_bank_account');
  assert.equal(f['payment_method_types[1]'], 'card');
  assert.equal(f['payment_method_options[us_bank_account][verification_method]'], 'automatic');
  assert.equal(f['line_items[0][price]'], 'price_p');
  assert.equal(f['line_items[0][quantity]'], '1');
  assert.equal(f['line_items[1][price]'], 'price_e');
  assert.equal(f['line_items[1][quantity]'], '3');
  assert.equal(f['metadata[orgId]'], 'org1');
  assert.equal(f['subscription_data[metadata][plan]'], 'growth');
  assert.equal(Object.keys(f).some((k) => k.startsWith('automatic_tax')), false);
});

test('tax flag on adds automatic_tax to the session', async () => {
  calls.length = 0;
  const env = { ...ENV(), STRIPE_AUTOMATIC_TAX: '1' };
  await createPlanCheckout(makeStripe(env), env, { ...input, plan: 'starter', books: 1 });
  assert.equal(calls[0].form['automatic_tax[enabled]'], 'true');
});

test('portal session uses the stored customer', async () => {
  calls.length = 0;
  const env = ENV();
  const s = await createPortalSession(makeStripe(env), 'cus_1', 'https://x/back');
  assert.equal(s.url, 'https://standin.invalid/portal');
  assert.equal(calls[0].form['customer'], 'cus_1');
  assert.equal(calls[0].form['return_url'], 'https://x/back');
});

test('extra-book sync: creates, updates, removes, and does nothing when already right', async () => {
  const env = ENV();
  const stripe = makeStripe(env);
  subItems = [{ id: 'si_base', quantity: 1, price: { id: 'price_p' } }];
  calls.length = 0;
  assert.deepEqual(await syncExtraBookQuantity(stripe, env, { stripeSubscriptionId: 'sub_1', books: 12 }), { action: 'created', quantity: 2 });
  assert.equal(calls.at(-1)!.form['quantity'], '2');
  assert.equal(calls.at(-1)!.form['price'], 'price_e');

  subItems = [...subItems, { id: 'si_extra', quantity: 2, price: { id: 'price_e' } }];
  assert.equal((await syncExtraBookQuantity(stripe, env, { stripeSubscriptionId: 'sub_1', books: 12 })).action, 'none');
  assert.deepEqual(await syncExtraBookQuantity(stripe, env, { stripeSubscriptionId: 'sub_1', books: 15 }), { action: 'updated', quantity: 5 });
  assert.deepEqual(await syncExtraBookQuantity(stripe, env, { stripeSubscriptionId: 'sub_1', books: 8 }), { action: 'removed', quantity: 0 });
  assert.equal(calls.at(-1)!.method, 'DELETE');
});

test('extra-book sync leaves a non-Practice subscription alone', async () => {
  const env = ENV();
  subItems = [{ id: 'si_x', quantity: 1, price: { id: 'price_s' } }];
  calls.length = 0;
  const r = await syncExtraBookQuantity(makeStripe(env), env, { stripeSubscriptionId: 'sub_1', books: 40 });
  assert.equal(r.action, 'none');
  assert.equal(calls.every((c) => c.method === 'GET'), true);
});
