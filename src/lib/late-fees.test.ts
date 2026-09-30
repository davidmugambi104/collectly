import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_POLICY, parsePolicyInput, percentOfCents, proposeFees, describePolicy, MAX_PERIODS, type FeePolicy, type FeeInvoice, type DecidedFee } from './late-fees.ts';

const asOf = new Date('2026-10-01T12:00:00Z');
const on = (over: Partial<FeePolicy> = {}): FeePolicy => ({ ...DEFAULT_POLICY, enabled: true, kind: 'percent', value: 2, graceDays: 14, ...over });
const inv = (over: Partial<FeeInvoice> = {}): FeeInvoice => ({ id: 'i1', number: 'INV-1', currency: 'USD', status: 'overdue', amount: 1000, amountPaid: 0, dueDate: '2026-09-01T12:00:00Z', ...over });

test('off, or a zero value, proposes nothing', () => {
  assert.deepEqual(proposeFees(DEFAULT_POLICY, [inv()], [], asOf), []);
  assert.deepEqual(proposeFees(on({ value: 0 }), [inv()], [], asOf), []);
});

test('percent of the unpaid balance, in cents, rounded half up', () => {
  const p = proposeFees(on({ value: 2 }), [inv({ amount: 1000, amountPaid: 250 })], [], asOf);
  assert.equal(p.length, 1);
  assert.equal(p[0].amountCents, 1500); // 2% of 750.00
  assert.equal(percentOfCents(1005, 0.5), 5);   // 5.025 -> 5
  assert.equal(percentOfCents(1010, 0.5), 5);   // 5.05  -> 5
  assert.equal(percentOfCents(1100, 0.5), 6);   // 5.5   -> 6 (half up)
  assert.equal(percentOfCents(10, 2.5), 0);     // 0.25  -> 0
  assert.equal(percentOfCents(30, 10), 3);      // 30 cents at 10%
});

test('flat fee, in its own currency only', () => {
  const policy = on({ kind: 'flat', value: 25, currency: 'USD' });
  const p = proposeFees(policy, [inv(), inv({ id: 'e', number: 'EUR-1', currency: 'EUR' })], [], asOf);
  assert.deepEqual(p.map((x) => [x.invoiceNumber, x.amountCents]), [['INV-1', 2500]]);
});

test('the grace period: exactly N days late is not yet, N+1 is', () => {
  const policy = on({ graceDays: 14 });
  const due = (daysAgo: number) => new Date(asOf.getTime() - daysAgo * 86_400_000).toISOString();
  assert.equal(proposeFees(policy, [inv({ dueDate: due(14) })], [], asOf).length, 0);
  assert.equal(proposeFees(policy, [inv({ dueDate: due(15) })], [], asOf).length, 1);
  assert.equal(proposeFees(on({ graceDays: 0 }), [inv({ dueDate: due(0) })], [], asOf).length, 0);
  assert.equal(proposeFees(on({ graceDays: 0 }), [inv({ dueDate: due(1) })], [], asOf).length, 1);
});

test('only open, owed, undisputed invoices', () => {
  for (const status of ['draft', 'paid', 'written_off', 'disputed']) assert.equal(proposeFees(on(), [inv({ status })], [], asOf).length, 0, status);
  for (const status of ['sent', 'viewed', 'overdue', 'partial']) assert.equal(proposeFees(on(), [inv({ status })], [], asOf).length, 1, status);
  assert.equal(proposeFees(on(), [inv({ amountPaid: 1000 })], [], asOf).length, 0);
  assert.equal(proposeFees(on(), [inv({ amountPaid: 1200 })], [], asOf).length, 0);
});

test('a fee already decided is not proposed again, waived or not', () => {
  const d = (status: DecidedFee['status']): DecidedFee => ({ invoiceId: 'i1', period: 0, amountCents: 2000, status });
  for (const s of ['applied', 'paid', 'waived'] as const) assert.equal(proposeFees(on(), [inv()], [d(s)], asOf).length, 0, s);
  assert.equal(proposeFees(on(), [inv()], [{ ...d('applied'), invoiceId: 'other' }], asOf).length, 1);
});

test('monthly repeat: one fee per 30 days, each only once', () => {
  const policy = on({ repeatMonthly: true, graceDays: 10 });
  const due = (daysAgo: number) => new Date(asOf.getTime() - daysAgo * 86_400_000).toISOString();
  assert.deepEqual(proposeFees(policy, [inv({ dueDate: due(11) })], [], asOf).map((x) => x.period), [0]);
  assert.deepEqual(proposeFees(policy, [inv({ dueDate: due(40) })], [], asOf).map((x) => x.period), [0]);     // 40 is not > 10+30
  assert.deepEqual(proposeFees(policy, [inv({ dueDate: due(41) })], [], asOf).map((x) => x.period), [0, 1]);
  assert.deepEqual(proposeFees(policy, [inv({ dueDate: due(41) })], [{ invoiceId: 'i1', period: 0, amountCents: 1, status: 'applied' }], asOf).map((x) => x.period), [1]);
  // not repeating: only ever period 0
  assert.deepEqual(proposeFees(on({ graceDays: 10 }), [inv({ dueDate: due(400) })], [], asOf).map((x) => x.period), [0]);
});

test('repeat is bounded', () => {
  const policy = on({ repeatMonthly: true, graceDays: 0 });
  const p = proposeFees(policy, [inv({ dueDate: new Date(asOf.getTime() - 5000 * 86_400_000).toISOString() })], [], asOf);
  assert.equal(p.length, MAX_PERIODS);
});

test('the cap: total fees on an invoice never pass it, and a waived fee does not count', () => {
  const policy = on({ kind: 'flat', value: 60, currency: 'USD', repeatMonthly: true, graceDays: 0, capPercent: 10 }); // cap 100 on a 1000 invoice
  const old = inv({ dueDate: new Date(asOf.getTime() - 100 * 86_400_000).toISOString() }); // periods 0..3
  const p = proposeFees(policy, [old], [], asOf);
  assert.deepEqual(p.map((x) => [x.period, x.amountCents, x.capped]), [[0, 6000, false], [1, 4000, true]]);
  assert.equal(p.reduce((s, x) => s + x.amountCents, 0), 10000);
  // a fee already applied uses up room; a waived one does not
  assert.deepEqual(proposeFees(policy, [old], [{ invoiceId: 'i1', period: 0, amountCents: 6000, status: 'applied' }], asOf).map((x) => [x.period, x.amountCents]), [[1, 4000]]);
  assert.deepEqual(proposeFees(policy, [old], [{ invoiceId: 'i1', period: 0, amountCents: 6000, status: 'waived' }], asOf).map((x) => [x.period, x.amountCents]), [[1, 6000], [2, 4000]]);
  // cap already reached: nothing
  assert.equal(proposeFees(policy, [old], [{ invoiceId: 'i1', period: 0, amountCents: 10000, status: 'paid' }], asOf).length, 0);
});

test('proposals are ordered: most late first, then by number and period', () => {
  const a = inv({ id: 'a', number: 'B', dueDate: '2026-08-01T12:00:00Z' });
  const b = inv({ id: 'b', number: 'A', dueDate: '2026-09-01T12:00:00Z' });
  assert.deepEqual(proposeFees(on(), [b, a], [], asOf).map((x) => x.invoiceNumber), ['B', 'A']);
});

test('policy input is validated', () => {
  const good = { enabled: true, kind: 'percent', value: 1.5, graceDays: 14, repeatMonthly: true, capPercent: 10 };
  assert.deepEqual(parsePolicyInput(good), { ok: true, value: { enabled: true, kind: 'percent', value: 1.5, currency: 'USD', graceDays: 14, repeatMonthly: true, capPercent: 10 } });
  const bad: Array<[string, unknown]> = [
    ['not an object', null], ['enabled missing', { ...good, enabled: undefined }], ['unknown kind', { ...good, kind: 'interest' }],
    ['zero', { ...good, value: 0 }], ['negative', { ...good, value: -1 }], ['NaN', { ...good, value: 'abc' }], ['percent too high', { ...good, value: 26 }],
    ['three decimals', { ...good, value: 1.005 }], ['flat too high', { ...good, kind: 'flat', currency: 'USD', value: 100001 }],
    ['flat no currency', { ...good, kind: 'flat', value: 10 }], ['flat bad currency', { ...good, kind: 'flat', value: 10, currency: 'DOLLARS' }],
    ['grace negative', { ...good, graceDays: -1 }], ['grace fractional', { ...good, graceDays: 1.5 }], ['grace too long', { ...good, graceDays: 366 }],
    ['cap zero', { ...good, capPercent: 0 }], ['cap over 100', { ...good, capPercent: 101 }],
  ];
  for (const [name, input] of bad) assert.equal(parsePolicyInput(input).ok, false, name);
  const flat = parsePolicyInput({ enabled: false, kind: 'flat', value: 25, currency: 'eur', graceDays: 0, capPercent: null });
  assert.deepEqual(flat.ok && flat.value.currency, 'EUR');
  assert.equal(flat.ok && flat.value.capPercent, null);
});

test('policy in words', () => {
  assert.equal(describePolicy(DEFAULT_POLICY), 'Late fees are off.');
  assert.equal(describePolicy(on({ value: 1.5, repeatMonthly: true, capPercent: 10 })), '1.5% of the unpaid balance once an invoice is more than 14 days past due, and again every 30 days while it stays unpaid, never more than 10% of the invoice in total.');
  assert.equal(describePolicy(on({ kind: 'flat', value: 25, currency: 'USD', graceDays: 1 })), '25.00 USD once an invoice is more than 1 day past due, once.');
});
