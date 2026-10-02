import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstSessionView, type FirstSessionState } from './first-session.ts';

const blank: FirstSessionState = { booksConnected: false, hasSynced: false, invoiceCount: 0, overdueCount: 0, draftsWaiting: 0, remindersEver: 0, approvedCount: 0, paidAfterReminder: 0 };
const v = (o: Partial<FirstSessionState>) => firstSessionView({ ...blank, ...o });

test('brand new account: connect, nothing ticked', () => {
  const r = v({});
  assert.equal(r.doneCount, 0);
  assert.equal(r.next?.href, '/dashboard/integrations');
  assert.match(r.next!.label, /Connect/);
  assert.equal(r.showChecklist, true);
});

test('connected but never synced: next is the first sync', () => {
  const r = v({ booksConnected: true });
  assert.match(r.next!.label, /first sync/);
  assert.match(r.steps[0].note, /not run yet/);
});

test('connected and synced with nothing imported says so and offers no fake action', () => {
  const r = v({ booksConnected: true, hasSynced: true });
  assert.equal(r.next, null);
  assert.ok(r.idleNote);
});

test('invoices in and some overdue: go draft', () => {
  const r = v({ invoiceCount: 8, overdueCount: 3 });
  assert.equal(r.steps[0].done, true);
  assert.match(r.next!.label, /3 overdue invoices/);
});

test('invoices in but none overdue: honest idle note, no action', () => {
  const r = v({ invoiceCount: 8 });
  assert.equal(r.next, null);
  assert.match(r.idleNote!, /Nothing is overdue/);
});

test('drafts waiting go straight to the approval queue, even when overdue is 0', () => {
  const r = v({ invoiceCount: 8, overdueCount: 0, draftsWaiting: 1, remindersEver: 1 });
  assert.equal(r.next?.href, '/dashboard/dunning#approvals');
  assert.equal(r.next?.label, 'Review 1 reminder waiting');
});

test('drafted but all skipped: nothing to push, no nag', () => {
  const r = v({ invoiceCount: 8, overdueCount: 3, remindersEver: 2 });
  assert.equal(r.next, null);
  assert.ok(r.idleNote);
  assert.equal(r.doneCount, 2);
});

test('first approval ticks and retires the setup card; payment step stays unticked until real', () => {
  const r = v({ invoiceCount: 8, remindersEver: 1, approvedCount: 1 });
  assert.equal(r.showChecklist, false);
  assert.deepEqual(r.steps.map((s) => s.done), [true, true, true, false]);
  const p = v({ invoiceCount: 8, remindersEver: 1, approvedCount: 1, paidAfterReminder: 1 });
  assert.equal(p.steps[3].done, true);
});
