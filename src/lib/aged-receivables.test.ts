import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAgedReport, agedBucketIndex, daysPastDue, money } from './aged-receivables.ts';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const due = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * 86_400_000);
const inv = (o: Partial<Parameters<typeof buildAgedReport>[0][number]> & { d: number; amount?: string }) => ({
  customerId: 'c1', customerName: 'Acme', currency: 'USD', status: 'sent', amount: o.amount ?? '100.00', amountPaid: '0', dueDate: due(o.d), ...o,
});

test('bucket edges match the Overview chart (bucketFor in utils.ts)', () => {
  assert.deepEqual([-5, 0, 1, 30, 31, 60, 61, 90, 91, 400].map(agedBucketIndex), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
});

test('splits one customer across buckets and totals it', () => {
  const r = buildAgedReport([inv({ d: -3 }), inv({ d: 10, amount: '50.50' }), inv({ d: 95, amount: '200' })], NOW);
  assert.equal(r.rows.length, 1);
  assert.deepEqual(r.rows[0].buckets, [10000, 5050, 0, 0, 20000]);
  assert.equal(r.rows[0].total, 35050);
  assert.equal(r.rows[0].overdue, 25050);
  assert.equal(r.rows[0].unpaidCount, 3);
  assert.equal(r.rows[0].oldestDaysOverdue, 95);
});

test('uses the balance, not the invoice amount, and skips closed invoices', () => {
  const r = buildAgedReport([
    inv({ d: 10, amount: '100', amountPaid: '40' }),
    inv({ d: 10, status: 'paid' }), inv({ d: 10, status: 'written_off' }), inv({ d: 10, status: 'draft' }),
    inv({ d: 10, amount: '100', amountPaid: '100' }),
  ], NOW);
  assert.equal(r.rows[0].total, 6000);
  assert.equal(r.rows[0].unpaidCount, 1);
});

test('disputed and partial invoices are still owed', () => {
  const r = buildAgedReport([inv({ d: 40, status: 'disputed' }), inv({ d: 40, status: 'partial', amountPaid: '25' })], NOW);
  assert.equal(r.rows[0].total, 17500);
});

test('biggest debt first; currencies never mix', () => {
  const r = buildAgedReport([
    inv({ customerId: 'a', customerName: 'Small', d: 5, amount: '10' }),
    inv({ customerId: 'b', customerName: 'Big', d: 5, amount: '900' }),
    inv({ customerId: 'b', customerName: 'Big', d: 5, amount: '500', currency: 'GBP' }),
  ], NOW);
  assert.deepEqual(r.rows.map((x) => `${x.customer}/${x.currency}`), ['Big/USD', 'Big/GBP', 'Small/USD']);
  assert.deepEqual(r.totals.map((t) => [t.currency, t.total]), [['GBP', 50000], ['USD', 91000]]);
});

test('cents add up exactly', () => {
  const r = buildAgedReport([inv({ d: 1, amount: '0.10' }), inv({ d: 1, amount: '0.20' })], NOW);
  assert.equal(r.rows[0].total, 30);
  assert.equal(money(r.rows[0].total), '0.30');
  assert.equal(daysPastDue(due(3), NOW), 3);
});
