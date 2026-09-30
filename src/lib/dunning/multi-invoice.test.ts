import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summariseOthers, renderOthersHtml, describeOthers, MAX_LISTED } from './multi-invoice.ts';

const now = new Date('2026-10-01T12:00:00Z');
const inv = (number: string, due: string, balance: number, currency = 'USD') => ({ number, dueDate: new Date(due), balance, currency });

test('nothing to add means null, so the email is unchanged', () => {
  assert.equal(summariseOthers([], 100, 'USD', now), null);
  assert.equal(summariseOthers([inv('A', '2026-09-01', 0)], 100, 'USD', now), null);
});

test('adds the others to this invoice, oldest first', () => {
  const s = summariseOthers([inv('B', '2026-09-20', 200), inv('A', '2026-09-01', 300.5)], 100, 'USD', now)!;
  assert.deepEqual(s.rows.map((r) => r.number), ['A', 'B']);
  assert.equal(s.count, 2);
  assert.equal(s.othersTotal, '$500.50');
  assert.equal(s.grandTotal, '$600.50');
  assert.equal(s.rows[0].daysOverdue, 30);
});

test('cents do not drift (0.1 + 0.2)', () => {
  const s = summariseOthers([inv('A', '2026-09-01', 0.1), inv('B', '2026-09-02', 0.2)], 0.1, 'USD', now)!;
  assert.equal(s.othersTotal, '$0.30');
  assert.equal(s.grandTotal, '$0.40');
});

test('other currencies are left out, never added in', () => {
  const s = summariseOthers([inv('A', '2026-09-01', 100), inv('E', '2026-09-01', 999, 'EUR')], 50, 'USD', now)!;
  assert.equal(s.count, 1);
  assert.equal(s.grandTotal, '$150.00');
  assert.equal(summariseOthers([inv('E', '2026-09-01', 999, 'EUR')], 50, 'USD', now), null);
});

test('a long list is capped, but the total still counts every invoice', () => {
  const many = Array.from({ length: MAX_LISTED + 3 }, (_, i) => inv(`N${String(i).padStart(2, '0')}`, '2026-09-01', 10));
  const s = summariseOthers(many, 0, 'USD', now)!;
  assert.equal(s.rows.length, MAX_LISTED);
  assert.equal(s.moreCount, 3);
  assert.equal(s.count, MAX_LISTED + 3);
  assert.equal(s.othersTotal, '$130.00');
  assert.match(renderOthersHtml(s), /and 3 more invoices/);
});

test('an invoice number cannot inject markup', () => {
  const s = summariseOthers([inv('<img src=x onerror=1>"', '2026-09-01', 10)], 1, 'USD', now)!;
  const html = renderOthersHtml(s);
  assert.ok(!html.includes('<img'));
  assert.match(html, /&lt;img/);
});

test('wording: one other, several others, and the queue line', () => {
  const one = summariseOthers([inv('A', '2026-09-01', 10)], 5, 'USD', now)!;
  assert.match(renderOthersHtml(one), /Another invoice is also overdue/);
  assert.equal(describeOthers(one), 'Also lists 1 other overdue invoice ($10.00); $15.00 overdue in all.');
  const two = summariseOthers([inv('A', '2026-09-01', 10), inv('B', '2026-09-01', 10)], 5, 'USD', now)!;
  assert.match(renderOthersHtml(two), /2 other invoices are also overdue/);
});

test('an unknown currency code still formats, without throwing', () => {
  const s = summariseOthers([inv('A', '2026-09-01', 10, 'XXXX')], 5, 'XXXX', now)!;
  assert.equal(s.grandTotal, 'XXXX 15.00');
});
