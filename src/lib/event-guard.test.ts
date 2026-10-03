import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isForbiddenKey } from './event-guard.ts';
import { MARKETING_EVENTS, prepareEvent, type MarketingProps } from './track-events.ts';
import { FUNNEL_EVENTS, prepareFunnelEvent, type FunnelProps } from './funnel-shapes.ts';

const PII_KEYS = [
  'email', 'customerEmail', 'customer_email', 'contact_email', 'name', 'customerName', 'customer_name', 'business_name',
  'firstName', 'phone', 'phoneNumber', 'amount', 'total', 'balance', 'invoiceAmount', 'price', 'subject', 'body',
  'message', 'note', 'notes', 'description', 'address', 'invoiceNumber', 'invoice_number', 'companyName', 'recipient', 'token', 'password',
];

test('key-name denylist catches personal and invoice content', () => {
  for (const k of PII_KEYS) assert.ok(isForbiddenKey(k), `${k} should be forbidden`);
});

test('id-style keys are allowed', () => {
  for (const k of ['customerId', 'invoice_id', 'orgId', 'runId', 'invoiceId']) assert.ok(!isForbiddenKey(k), `${k} should be allowed`);
  for (const k of ['emailId', 'name_id']) assert.ok(isForbiddenKey(k), `${k} should be forbidden`);
});

test('every registered key in every event passes the denylist', () => {
  for (const shapes of [MARKETING_EVENTS, FUNNEL_EVENTS] as Record<string, Record<string, unknown>>[]) {
    for (const [event, shape] of Object.entries(shapes)) {
      for (const key of Object.keys(shape)) assert.ok(!isForbiddenKey(key), `${event}.${key} is a forbidden key name`);
    }
  }
});

test('marketing events: no PII key can reach PostHog, under any event', () => {
  for (const event of Object.keys(MARKETING_EVENTS) as (keyof typeof MARKETING_EVENTS)[]) {
    for (const k of PII_KEYS) {
      const { props, problems } = prepareEvent(event, { [k]: 'x' });
      assert.ok(!(k in props), `${event} let ${k} through`);
      assert.ok(problems.some((p) => p.includes(`"${k}"`)), `${event} did not flag ${k}`);
    }
  }
});

test('marketing events: unknown event sends nothing', () => {
  const r = prepareEvent('made_up' as never, { tier: 'growth' });
  assert.deepEqual(r.props, {});
  assert.equal(r.problems.length, 1);
});

test('marketing events: unregistered keys and bad values are dropped, good ones kept', () => {
  const r = prepareEvent('pricing_tier_click', { tier: 'growth', monthly: 399, plan_label: 'x', extra: 1 });
  assert.deepEqual(r.props, { tier: 'growth', monthly: 399 });
  assert.equal(r.problems.length, 2);
  const bad = prepareEvent('pricing_tier_click', { tier: 'jane@example.com' });
  assert.deepEqual(bad.props, {});
  assert.ok(bad.problems.length >= 1);
  assert.deepEqual(prepareEvent('pricing_tier_click', { tier: 'growth', monthly: 12.5 }).props, { tier: 'growth' });
});

test('marketing events: email-shaped or numeric-run values are refused as copy and tokens', () => {
  assert.deepEqual(prepareEvent('homepage_cta_click', { location: 'hero', label: 'a@b.co' }).props, { location: 'hero' });
  assert.deepEqual(prepareEvent('homepage_cta_click', { location: 'Jane Smith', label: 'Start free trial' }).props, { label: 'Start free trial' });
  assert.deepEqual(prepareEvent('homepage_cta_click', { location: 'hero', label: 'Call 5551234567' }).props, { location: 'hero' });
  assert.deepEqual(prepareEvent('homepage_cta_click', { location: 'hero', label: 'Start free trial' }).props, { location: 'hero', label: 'Start free trial' });
});

test('existing call sites still validate', () => {
  assert.equal(prepareEvent('tour_page_view').problems.length, 0);
  assert.equal(prepareEvent('pricing_page_view').problems.length, 0);
  assert.equal(prepareEvent('signup_started').problems.length, 0);
  assert.equal(prepareEvent('audience_page_view', { audience: 'bookkeepers' }).problems.length, 0);
  assert.equal(prepareEvent('audience_page_view', { audience: 'Acme Ltd' }).problems.length, 1);
  assert.ok(prepareEvent('homepage_cta_click', { location: 'hero' }).problems.some((p) => p.includes('missing')));
});

test('funnel events: PII keys are dropped on every server event', () => {
  for (const type of Object.keys(FUNNEL_EVENTS)) {
    for (const k of PII_KEYS) {
      const { props, problems } = prepareFunnelEvent(type, { [k]: 'x' });
      assert.ok(!(k in props), `${type} let ${k} through`);
      assert.ok(problems.some((p) => p.includes(`"${k}"`)));
    }
  }
});

test('funnel events: shapes enforce enums, integers and booleans', () => {
  const ok = prepareFunnelEvent('integration.synced', { provider: 'xero', customers: 12, invoices: 40, rowErrors: 0, hadInvoices: true });
  assert.equal(ok.problems.length, 0);
  assert.equal(ok.props.invoices, 40);
  const bad = prepareFunnelEvent('integration.synced', { provider: 'Acme Ltd', customers: -1, invoices: '40', rowErrors: 0, hadInvoices: 'yes' });
  assert.deepEqual(bad.props, { rowErrors: 0 });
  assert.equal(prepareFunnelEvent('billing.cancel_requested', { kind: 'cancel', plan: 'growth', detailGiven: true }).problems.length, 0);
  assert.ok(prepareFunnelEvent('billing.cancel_requested', { kind: 'cancel', plan: 'growth', note: 'too dear' }).problems.length > 0);
  assert.ok(prepareFunnelEvent('not.an.event', {}).problems.length === 1);
});

// Compile-time checks: tsc fails if any @ts-expect-error below stops being an error.
test('types reject PII keys and bad values at compile time', () => {
  const okMarketing: MarketingProps<'pricing_tier_click'> = { tier: 'growth', monthly: 399 };
  // @ts-expect-error email is not a property of any marketing event
  const a: MarketingProps<'pricing_tier_click'> = { tier: 'growth', email: 'a@b.co' };
  // @ts-expect-error tier is a closed enum
  const b: MarketingProps<'pricing_tier_click'> = { tier: 'Acme Ltd' };
  // @ts-expect-error amount is a number-free event; no amount key exists
  const c: MarketingProps<'signup_started'> = { amount: 100 };
  const okFunnel: FunnelProps<'integration.connected'> = { provider: 'xero' };
  // @ts-expect-error customerName is not a property of the server event
  const d: FunnelProps<'integration.connected'> = { provider: 'xero', customerName: 'Jane' };
  assert.ok(okMarketing && okFunnel && a && b && c && d);
});
