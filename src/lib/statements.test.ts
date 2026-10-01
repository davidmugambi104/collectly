import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStatement, statementCsv, renderStatementHtml, describeStatement, statementSubject, formatMoney } from './statements.ts';

const asOf = new Date('2026-10-01T12:00:00Z');
const inv = (number: string, due: string, amount: number | string, paid: number | string = 0, status = 'sent', currency = 'USD') =>
  ({ number, currency, status, issueDate: '2026-08-01T00:00:00Z', dueDate: due, amount, amountPaid: paid });

test('nothing owed means no sections', () => {
  assert.equal(buildStatement([], asOf).sections.length, 0);
  assert.equal(buildStatement([inv('P', '2026-09-01', 100, 100, 'paid'), inv('D', '2026-09-01', 100, 0, 'draft'), inv('W', '2026-09-01', 100, 0, 'written_off')], asOf).sections.length, 0);
});

test('an invoice paid in full by amountPaid, or overpaid, is not listed', () => {
  assert.equal(buildStatement([inv('A', '2026-09-01', 100, 100), inv('B', '2026-09-01', 100, 120)], asOf).sections.length, 0);
});

test('balance, totals, buckets and order, in whole cents', () => {
  const s = buildStatement([
    inv('C', '2026-10-15', 50),           // not yet due
    inv('B', '2026-09-20', 200, 50),      // 11 days late, balance 150
    inv('A', '2026-06-01', 0.3),          // 122 days late
    inv('A2', '2026-06-01', 0.1),         // 122 days late, same due date
  ], asOf);
  assert.equal(s.sections.length, 1);
  const sec = s.sections[0];
  assert.deepEqual(sec.rows.map((r) => r.number), ['A', 'A2', 'B', 'C']);
  assert.equal(sec.totalCents, 5000 + 15000 + 30 + 10);
  assert.equal(sec.overdueCents, 15000 + 30 + 10);
  assert.deepEqual(sec.bucketsCents, [5000, 15000, 0, 0, 40]);
  assert.equal(sec.rows[2].daysOverdue, 11);
  assert.equal(sec.rows[3].bucket, 'current');
});

test('due today is not yet late; the bucket edges match the aged report', () => {
  const s = buildStatement([inv('T', '2026-10-01T00:00:00Z', 10), inv('E30', '2026-09-01T12:00:00Z', 10), inv('E31', '2026-08-31T12:00:00Z', 10), inv('E91', '2026-07-01T12:00:00Z', 10)], asOf);
  const b = Object.fromEntries(s.sections[0].rows.map((r) => [r.number, r.bucket]));
  assert.equal(b.T, 'current');
  assert.equal(b.E30, '1-30');
  assert.equal(b.E31, '31-60');
  assert.equal(b.E91, '90+');
});

test('each currency is its own section, never added together', () => {
  const s = buildStatement([inv('U', '2026-09-01', 100), inv('E', '2026-09-01', 900, 0, 'sent', 'EUR')], asOf);
  assert.deepEqual(s.sections.map((x) => [x.currency, x.totalCents]), [['EUR', 90000], ['USD', 10000]]);
  assert.equal(describeStatement(s), '€900.00 owed, €900.00 of it overdue; $100.00 owed, $100.00 of it overdue');
});

test('a disputed invoice is listed, marked, and still counted (same as the aged report)', () => {
  const s = buildStatement([inv('X', '2026-09-01', 100, 0, 'disputed')], asOf);
  assert.equal(s.sections[0].rows[0].disputed, true);
  assert.equal(s.sections[0].totalCents, 10000);
  assert.match(renderStatementHtml({ customerName: 'C', businessName: 'B', statement: s }), /in dispute/);
});

test('HTML escapes everything it prints, including the owner note', () => {
  const s = buildStatement([inv('<script>alert(1)</script>', '2026-09-01', 100)], asOf);
  const html = renderStatementHtml({ customerName: 'A & "B" <i>', businessName: '<b>Biz</b>', statement: s, note: 'Hi <img src=x onerror=1>\nThanks' });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<b>Biz'));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /A &amp; &quot;B&quot; &lt;i&gt;/);
  assert.match(html, /Thanks/);
});

test('HTML: an empty statement says so, and totals are printed', () => {
  assert.match(renderStatementHtml({ customerName: 'C', businessName: 'B', statement: buildStatement([], asOf) }), /Nothing is owed/);
  const s = buildStatement([inv('A', '2026-09-01', 1234.5), inv('B', '2026-10-20', 10)], asOf);
  const html = renderStatementHtml({ customerName: 'C', businessName: 'B', statement: s });
  assert.match(html, /Total owed/);
  assert.match(html, /\$1,244\.50/);
  assert.match(html, /30 days late/);
  assert.match(html, /not yet due/);
});

test('CSV: fixed columns, quoted commas, and formulas are neutralised', () => {
  const s = buildStatement([inv('=HYPERLINK("x")', '2026-09-01', 10), inv('A,B', '2026-09-02', 20.5)], asOf);
  const lines = statementCsv(s).trim().split('\n');
  assert.equal(lines[0], 'Invoice,Currency,Issued,Due,Amount,Paid,Balance,Days overdue,Age bucket,In dispute');
  assert.ok(lines[1].startsWith(`"'=HYPERLINK(""x"")",USD,`));
  assert.ok(lines[2].startsWith('"A,B",USD,2026-08-01,2026-09-02,20.50,0.00,20.50,29,1-30,no'));
});

test('subject and money', () => {
  assert.equal(statementSubject('Acme', asOf), 'Statement from Acme, Oct 1, 2026');
  assert.equal(statementSubject('  ', asOf), 'Statement of account, Oct 1, 2026');
  assert.ok(!/[\r\n]/.test(statementSubject('A\r\nBcc: x', asOf)));
  assert.equal(formatMoney(123456, 'USD'), '$1,234.56');
  assert.equal(formatMoney(5, 'XXXX'), 'XXXX 0.05');
});

const fee = (invoiceNumber: string, amountCents: number, currency = 'USD', period = 0) => ({ invoiceNumber, amountCents, currency, period });

test('late fees are their own lines, counted in the total and as overdue, never in the invoice buckets', () => {
  const s = buildStatement([inv('A', '2026-09-20', 200)], asOf, [fee('A', 1500), fee('A', 1500, 'USD', 1)]);
  const sec = s.sections[0];
  assert.equal(sec.feesCents, 3000);
  assert.equal(sec.totalCents, 20000 + 3000);
  assert.equal(sec.overdueCents, 20000 + 3000);
  assert.deepEqual(sec.bucketsCents, [0, 20000, 0, 0, 0]);
  assert.equal(describeStatement(s), '$230.00 owed (including $30.00 in late fees), $230.00 of it overdue');
  const html = renderStatementHtml({ customerName: 'C', businessName: 'B', statement: s });
  assert.match(html, /Late fee on A<\/td>/);
  assert.match(html, /Late fee on A \(month 2\)/);
  assert.match(html, /Total owed, including late fees/);
  assert.match(html, /\$230\.00/);
});

test('a fee on an invoice that is now paid still shows, in its currency, until it is settled', () => {
  const s = buildStatement([], asOf, [fee('GONE-1', 500, 'EUR')]);
  assert.equal(s.sections.length, 1);
  assert.deepEqual([s.sections[0].currency, s.sections[0].totalCents, s.sections[0].rows.length], ['EUR', 500, 0]);
});

test('no fees: nothing changes in the wording', () => {
  const s = buildStatement([inv('A', '2026-09-20', 200)], asOf);
  assert.equal(s.sections[0].feesCents, 0);
  assert.match(renderStatementHtml({ customerName: 'C', businessName: 'B', statement: s }), />Total owed</);
  assert.ok(!/late fee/i.test(renderStatementHtml({ customerName: 'C', businessName: 'B', statement: s })));
});

test('fees of zero are ignored; a fee number cannot inject markup; CSV carries the fee line', () => {
  assert.equal(buildStatement([], asOf, [fee('A', 0)]).sections.length, 0);
  const s = buildStatement([], asOf, [fee('<img src=x>', 1000)]);
  assert.ok(!renderStatementHtml({ customerName: 'C', businessName: 'B', statement: s }).includes('<img'));
  const csv = statementCsv(buildStatement([inv('A', '2026-09-20', 200)], asOf, [fee('A', 1500)]));
  assert.match(csv, /^Late fee on A,USD,,,15\.00,0\.00,15\.00,,late fee,no$/m);
});

test('payment details go at the bottom, escaped; none means no section', () => {
  const s = buildStatement([inv('A', '2026-09-20', 200)], asOf);
  const html = renderStatementHtml({ customerName: 'C', businessName: 'B', statement: s, footer: 'Bank: Acme <b>Ltd</b>\nAccount 123' });
  assert.match(html, /How to pay/);
  assert.match(html, /Account 123/);
  assert.ok(!html.includes('<b>Ltd'));
  assert.ok(!/How to pay/.test(renderStatementHtml({ customerName: 'C', businessName: 'B', statement: s, footer: '   ' })));
  assert.ok(!/How to pay/.test(renderStatementHtml({ customerName: 'C', businessName: 'B', statement: s })));
});

test('cleanFooter trims, caps and empties', async () => {
  const { cleanFooter, MAX_FOOTER_CHARS } = await import('./statements.ts');
  assert.equal(cleanFooter('  hi\r\nthere \u0000 '), 'hi\nthere');
  assert.equal(cleanFooter('   '), null);
  assert.equal(cleanFooter(42), null);
  assert.equal(cleanFooter('x'.repeat(5000))!.length, MAX_FOOTER_CHARS);
});
