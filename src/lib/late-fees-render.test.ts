import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summariseFees, renderFeesHtml, describeFees, MAX_FEE_ROWS } from './late-fees-render.ts';

const f = (invoiceNumber: string, amountCents: number, currency = 'USD', period = 0) => ({ invoiceNumber, amountCents, currency, period });

test('no fees in this currency means nothing is added', () => {
  assert.equal(summariseFees([], 'USD', 10000), null);
  assert.equal(summariseFees([f('A', 500, 'EUR')], 'USD', 10000), null);
  assert.equal(summariseFees([f('A', 0)], 'USD', 10000), null);
});

test('fees are added to the base, in cents', () => {
  const s = summariseFees([f('B', 1500, 'USD', 1), f('A', 1000)], 'USD', 93_800_00)!;
  assert.deepEqual(s.rows.map((r) => r.label), ['Late fee on A', 'Late fee on B (month 2)']);
  assert.equal(s.feesTotal, '$25.00');
  assert.equal(s.total, '$93,825.00');
  assert.equal(s.totalCents, 9_382_500);
  assert.equal(describeFees(s), 'Includes 2 late fees ($25.00); $93,825.00 in all.');
});

test('one fee reads in the singular; a long list is capped but totalled in full', () => {
  assert.match(renderFeesHtml(summariseFees([f('A', 100)], 'USD', 0)!), /A late fee has been added/);
  const many = Array.from({ length: MAX_FEE_ROWS + 2 }, (_, i) => f(`N${String(i).padStart(2, '0')}`, 100));
  const s = summariseFees(many, 'USD', 0)!;
  assert.equal(s.rows.length, MAX_FEE_ROWS);
  assert.equal(s.feesTotal, '$12.00');
  assert.match(renderFeesHtml(s), /and 2 more late fees/);
  assert.match(renderFeesHtml(s), /Late fees have been added/);
});

test('an invoice number cannot inject markup', () => {
  const html = renderFeesHtml(summariseFees([f('<img src=x onerror=1>', 100)], 'USD', 0)!);
  assert.ok(!html.includes('<img'));
  assert.match(html, /&lt;img/);
});
