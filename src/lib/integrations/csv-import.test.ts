import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { analyzeCsv, detectMapping, parseMoney, parseDate, inferDateFormat, csvAdapter, csvInvoiceId, csvCustomerId, CSV_MAX_ROWS, guessSource } from './csv-import.ts';
import { parseCsv } from '../csv-parse.ts';
import { PROVIDER_ID_PATTERN } from './imported-data.ts';

const fx = (n: string) => readFileSync(new URL(`./fixtures/csv/${n}`, import.meta.url), 'utf8');

test('every platform fixture auto-detects invoice number, customer, a date and an amount', () => {
  for (const f of readdirSync(new URL('./fixtures/csv/', import.meta.url))) {
    const a = analyzeCsv(fx(f));
    assert.equal(a.fatal, null, `${f}: ${a.fatal}`);
    for (const k of ['invoiceNumber', 'customerName', 'issueDate'] as const) assert.equal(typeof a.mapping[k], 'number', `${f} ${k}`);
    assert.ok(a.mapping.amount !== null || a.mapping.balance !== null, f);
    assert.ok(a.good.length >= 1, f);
  }
});

test('source guesses', () => {
  assert.equal(guessSource(parseCsv(fx('xero.csv')).rows[0]), 'Xero');
  assert.equal(guessSource(parseCsv(fx('quickbooks.csv')).rows[0]), 'QuickBooks');
  assert.equal(guessSource(parseCsv(fx('freshbooks.csv')).rows[0]), 'FreshBooks');
  assert.equal(guessSource(parseCsv(fx('zoho-books.csv')).rows[0]), 'Zoho Books');
  assert.equal(guessSource(parseCsv(fx('sage.csv')).rows[0]), 'Sage');
  assert.equal(guessSource(parseCsv(fx('wave.csv')).rows[0]), 'Wave');
  assert.equal(guessSource(parseCsv(fx('excel.csv')).rows[0]), null);
});

test('QuickBooks: thousands separators, partial payment, paid row, US dates', () => {
  const a = analyzeCsv(fx('quickbooks.csv'));
  assert.equal(a.dateFormat, 'mdy');
  assert.equal(a.good.length, 4);
  const [r1, r2, , r4] = a.good;
  assert.equal(r1.amount, 1200); assert.equal(r1.balance, 1200);
  assert.equal(r2.amount, 850); assert.equal(r2.balance, 350);
  assert.equal(a.good[2].customerName, 'Cooper & Sons, LLC');
  assert.equal(r4.state, 'paid');
  assert.equal(r1.issueDate.toISOString().slice(0, 10), '2026-03-15');
  assert.equal(r1.currency, 'USD');
  assert.ok(a.notes.some((n) => n.includes('No currency column')));
});

test('Xero: leading asterisks, day-first dates settled by evidence, currency, emails', () => {
  const a = analyzeCsv(fx('xero.csv'));
  assert.equal(a.dateFormat, 'dmy'); assert.equal(a.dateFormatAssumed, false);
  assert.equal(a.good[0].dueDate.toISOString().slice(0, 10), '2026-03-30');
  assert.equal(a.good[0].currency, 'GBP');
  assert.equal(a.good[0].customerEmail, 'accounts@harbour.example');
  assert.equal(a.good[1].balance, 250);
  assert.equal(a.mapping.balance, 9); // AmountDue, not Total
});

test('FreshBooks, Zoho, Sage, Wave map the right columns', () => {
  const fb = analyzeCsv(fx('freshbooks.csv'));
  assert.equal(fb.good[2].state, 'draft'); assert.equal(fb.good[2].currency, 'CAD'); assert.equal(fb.good[1].state, 'paid');
  const zo = analyzeCsv(fx('zoho-books.csv'));
  assert.equal(zo.good[2].state, 'voided'); assert.equal(zo.good[0].amount, 3200);
  const sg = analyzeCsv(fx('sage.csv'));
  assert.equal(sg.dateFormat, 'dmy'); assert.equal(sg.good[0].amount, 1080); assert.equal(sg.good[1].balance, 120);
  assert.equal(sg.headers[sg.mapping.customerName as number], 'Customer Name'); // not "Customer Ref"
  const wv = analyzeCsv(fx('wave.csv'));
  assert.equal(wv.good[0].amount, 560); assert.equal(wv.good[1].balance, 1000); assert.equal(wv.good[0].dueDate.toISOString().slice(0, 10), '2026-04-03');
  assert.equal(wv.good[0].invoiceNumber, '0000123');
});

test('Excel sheet: row-level errors name the row and the problem; good rows still come through', () => {
  const a = analyzeCsv(fx('excel.csv'));
  assert.equal(a.totalRows, 5);
  assert.equal(a.good.length, 3);
  assert.deepEqual(a.errors.map((e) => e.row), [5, 6]);
  assert.match(a.errors[0].message, /Amount "abc" is not a number/);
  assert.match(a.errors[1].message, /Issue date "31\/31\/2026"/);
  assert.equal(a.warnings.length, 1);
  assert.match(a.warnings[0].message, /Email/);
  assert.equal(a.good[2].state, 'paid');
});

test('a missing required column is a clear fatal, not a crash', () => {
  const a = analyzeCsv('foo,bar\n1,2');
  assert.match(a.fatal ?? '', /Pick a column for/);
  assert.equal(analyzeCsv('').fatal, 'The file is empty.');
  assert.match(analyzeCsv('Invoice number,Customer,Amount,Date').fatal ?? '', /no invoices/);
});

test('a user mapping overrides detection and bad indexes are ignored', () => {
  const csv = 'x,y,z,d\nINV1,Acme,50,2026-01-02';
  const a = analyzeCsv(csv, { mapping: { invoiceNumber: 0, customerName: 1, amount: 2, issueDate: 3, balance: 99 } });
  assert.equal(a.fatal, null);
  assert.equal(a.good[0].amount, 50);
  assert.equal(a.good[0].balance, 50);
});

test('duplicate invoice number for the same customer is an error on the second row; same number, other customer is fine', () => {
  const a = analyzeCsv('Invoice number,Customer,Amount,Date\n1,Acme,10,2026-01-01\n1,acme ,10,2026-01-01\n1,Beta,10,2026-01-01');
  assert.equal(a.good.length, 2);
  assert.match(a.errors[0].message, /Same invoice number and customer as row 2/);
});

test('rows over the limit and files over the size limit are refused', () => {
  const big = 'Invoice number,Customer,Amount,Date\n' + Array.from({ length: CSV_MAX_ROWS + 1 }, (_, i) => `${i},C${i},1,2026-01-01`).join('\n');
  assert.match(analyzeCsv(big).fatal ?? '', /more than 5000 rows/);
  const ok = 'Invoice number,Customer,Amount,Date\n' + Array.from({ length: CSV_MAX_ROWS }, (_, i) => `${i},C${i},1,2026-01-01`).join('\n');
  assert.equal(analyzeCsv(ok).good.length, CSV_MAX_ROWS);
  assert.match(analyzeCsv('a'.repeat(6 * 1024 * 1024)).fatal ?? '', /5 MB/);
});

test('money parsing', () => {
  const cases: Array<[string, number | null]> = [['1200', 1200], ['$1,200.50', 1200.5], ['1.200,50', 1200.5], ['1,5', 1.5], ['1,200', 1200], ['(45.00)', -45], ['-3', -3], ['£ 3 000', 3000], ['1.234.567', 1234567], ['abc', null], ['', null], ['USD 1,200.00', 1200], ['300 EUR', 300], ['1e9', null]];
  for (const [i, o] of cases) assert.equal(parseMoney(i), o, i);
});

test('date parsing and format inference', () => {
  assert.equal(parseDate('2026-03-04', 'mdy')?.toISOString().slice(0, 10), '2026-03-04');
  assert.equal(parseDate('03/04/2026', 'mdy')?.toISOString().slice(0, 10), '2026-03-04');
  assert.equal(parseDate('03/04/2026', 'dmy')?.toISOString().slice(0, 10), '2026-04-03');
  assert.equal(parseDate('4 Mar 2026', 'mdy')?.toISOString().slice(0, 10), '2026-03-04');
  assert.equal(parseDate('March 4, 2026', 'dmy')?.toISOString().slice(0, 10), '2026-03-04');
  assert.equal(parseDate('45000', 'mdy')?.toISOString().slice(0, 10), '2023-03-15');
  assert.equal(parseDate('2026-02-30', 'mdy'), null);
  assert.equal(parseDate('soon', 'mdy'), null);
  assert.deepEqual(inferDateFormat(['13/01/2026']), { format: 'dmy', assumed: false });
  assert.deepEqual(inferDateFormat(['01/13/2026']), { format: 'mdy', assumed: false });
  assert.deepEqual(inferDateFormat(['01/02/2026']), { format: 'mdy', assumed: true });
  assert.equal(analyzeCsv('Invoice number,Customer,Amount,Date\n1,A,1,01/02/2026', { dateFormat: 'dmy' }).good[0].issueDate.toISOString().slice(0, 10), '2026-02-01');
});

test('detectMapping uses each header once', () => {
  const m = detectMapping(['Total', 'Amount', 'Balance']);
  assert.equal(m.balance, 2); assert.equal(m.amount, 0);
});

test('ids are stable and case/space-insensitive, and match the purge pattern once prefixed', () => {
  assert.equal(csvInvoiceId('INV-1', 'Acme  Plumbing'), csvInvoiceId(' inv-1 ', 'acme plumbing'));
  assert.notEqual(csvInvoiceId('INV-1', 'Acme'), csvInvoiceId('INV-1', 'Beta'));
  const re = new RegExp(PROVIDER_ID_PATTERN.csv, 'i');
  assert.ok(re.test(`csv:${csvInvoiceId('1', 'a')}`) && re.test(`csv:${csvCustomerId('a')}`));
  assert.ok(!re.test('INV-1') && !re.test('1234'));
});

test('csvAdapter pages and merges customer emails', async () => {
  const a = analyzeCsv(fx('excel.csv'));
  const ad = csvAdapter(a.good);
  assert.equal(ad.configured(), true);
  const cs = await ad.listCustomers('o', 1);
  assert.equal(cs.length, 3);
  assert.deepEqual(await ad.listCustomers('o', 2), []);
  assert.equal((await ad.listOpenInvoices('o', 1)).length, 3);
});
