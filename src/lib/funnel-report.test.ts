import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFunnelReport, stepsForEvent, type FunnelEventRow, type FunnelOrgRow } from './funnel-report.ts';

const now = new Date('2026-10-05T00:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
const ev = (orgId: string, type: string, d: number, payload: unknown = {}): FunnelEventRow => ({ orgId, type, payload, createdAt: daysAgo(d) });
const org = (id: string, d: number, plan = 'starter'): FunnelOrgRow => ({ id, name: `Org ${id}`, plan, createdAt: daysAgo(d) });

test('event to step mapping', () => {
  assert.deepEqual(stepsForEvent({ type: 'dunning.run.approved', payload: {} }), ['approved', 'sent']);
  assert.deepEqual(stepsForEvent({ type: 'integration.synced', payload: { hadInvoices: false } }), []);
  assert.deepEqual(stepsForEvent({ type: 'integration.synced', payload: {} }), ['synced']);
  assert.deepEqual(stepsForEvent({ type: 'payment.succeeded', payload: { afterReminder: false } }), []);
  assert.deepEqual(stepsForEvent({ type: 'payment.succeeded', payload: { afterReminder: true } }), ['paid']);
});

test('cohort, conversion, stuck lists and plan mix', () => {
  const orgs = [org('a', 3, 'growth'), org('b', 3), org('c', 20), org('d', 60), org('e', 3)];
  const events = [
    ev('a', 'auth.signed_up', 3), ev('b', 'auth.signed_up', 3),
    ev('a', 'integration.connected', 3), ev('b', 'integration.connected', 2),
    ev('a', 'integration.synced', 3, { hadInvoices: true }), ev('b', 'integration.synced', 2, { hadInvoices: false }),
    ev('a', 'dunning.run.awaiting_approval', 2), ev('a', 'dunning.run.approved', 1),
    ev('a', 'payment.succeeded', 0, { afterReminder: true }),
    ev('c', 'integration.connected', 19),
    ev('c', 'billing.cancel_requested', 1),
  ];
  const [w7, w30, w90] = buildFunnelReport({
    now, events, orgs, subs: [{ orgId: 'b', plan: 'scale' }],
    memberships: [{ userId: 'u1', orgId: 'a' }, { userId: 'u1', orgId: 'b' }, { userId: 'u2', orgId: 'd' }],
  });
  assert.equal(w7.signups, 3); // a, b, e (e falls back to created_at)
  assert.deepEqual(w7.steps.map((s) => s.count), [3, 2, 1, 1, 1, 1, 1]);
  assert.equal(w7.steps[1].fromPrevious, 2 / 3);
  assert.equal(w7.steps[2].fromPrevious, 1 / 2);
  assert.equal(w30.signups, 4);
  assert.equal(w90.signups, 5);
  assert.equal(w7.cancelRequests, 0 + 1); // c cancelled within 7 days; cancel counts by event date, any cohort
  assert.deepEqual(w7.planMix, [{ plan: 'growth', count: 1 }, { plan: 'scale', count: 1 }, { plan: 'starter', count: 1 }]);
  assert.equal(w7.practiceOrgs, 2);
  assert.equal(w7.multiBookOwners, 1);
  assert.equal(w7.multiBookBooks, 2);
  assert.equal(w90.multiBookOwners, 1); // u2 has one book only
  // b is stuck waiting on the first sync, e waiting on connect
  assert.deepEqual(w7.stuck.map((g) => [g.afterStep, g.total]), [['signup', 1], ['connected', 1]]);
  assert.equal(w7.stuck[0].orgs[0].name, 'Org e');
  assert.equal(w7.stuck[0].orgs[0].daysSinceSignup, 3);
  assert.deepEqual(Object.keys(w7.stuck[0].orgs[0]).sort(), ['daysSinceSignup', 'name', 'orgId']);
});

test('empty input gives zeros and null ratios, not NaN', () => {
  const [w7] = buildFunnelReport({ now, events: [], orgs: [], subs: [], memberships: [] });
  assert.equal(w7.signups, 0);
  assert.equal(w7.steps[1].fromPrevious, null);
  assert.deepEqual(w7.stuck, []);
});
