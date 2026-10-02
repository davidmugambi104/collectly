import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankBooks, totalBooks, attentionFor, type BookFacts } from './practice.ts';

const NOW = new Date('2026-10-02T12:00:00Z');
const book = (o: Partial<BookFacts>): BookFacts => ({
  orgId: 'o', name: 'Book', openInvoices: 0, overdueInvoices: 0, money: {}, oldestOverdueDays: 0,
  awaitingApproval: 0, newReplies: 0, lastSyncAt: new Date('2026-10-02T06:00:00Z'), integrationError: false, hasIntegration: true, ...o,
});

test('a healthy book needs no attention', () => {
  assert.deepEqual(attentionFor(book({}), NOW), []);
});

test('each thing a person must do is named, connection first', () => {
  const a = attentionFor(book({ integrationError: true, newReplies: 2, awaitingApproval: 1 }), NOW);
  assert.deepEqual(a, ['Accounting connection needs to be reconnected', '2 replies waiting', '1 reminder waiting for approval']);
});

test('no integration and a stale sync are called out, but not both', () => {
  assert.deepEqual(attentionFor(book({ hasIntegration: false }), NOW), ['Not connected to Xero or QuickBooks']);
  assert.deepEqual(attentionFor(book({ lastSyncAt: new Date('2026-09-28T00:00:00Z') }), NOW), ['Has not synced in over 3 days']);
});

test('books that need a person come first, then the biggest overdue, then name', () => {
  const ranked = rankBooks([
    book({ orgId: 'big', name: 'Big', money: { USD: { outstanding: 9000, overdue: 8000 } } }),
    book({ orgId: 'reply', name: 'Reply', newReplies: 1, money: { USD: { outstanding: 100, overdue: 10 } } }),
    book({ orgId: 'small', name: 'Small', money: { USD: { outstanding: 500, overdue: 400 } } }),
    book({ orgId: 'a', name: 'Alpha' }), book({ orgId: 'z', name: 'Zeta' }),
  ], NOW);
  assert.deepEqual(ranked.map((b) => b.orgId), ['reply', 'big', 'small', 'a', 'z']);
});

test('totals are per currency and never mix them', () => {
  const t = totalBooks([
    book({ openInvoices: 3, overdueInvoices: 1, newReplies: 1, money: { USD: { outstanding: 10.1, overdue: 5 } } }),
    book({ openInvoices: 2, overdueInvoices: 2, awaitingApproval: 4, money: { USD: { outstanding: 20.2, overdue: 6 }, KES: { outstanding: 1000, overdue: 400 } } }),
  ]);
  assert.equal(t.openInvoices, 5); assert.equal(t.overdueInvoices, 3);
  assert.equal(t.awaitingApproval, 4); assert.equal(t.newReplies, 1);
  assert.deepEqual(t.money, { USD: { outstanding: 30.3, overdue: 11 }, KES: { outstanding: 1000, overdue: 400 } });
});
