/**
 * Spreadsheet (CSV) import, the part with no database: column detection, row checks, and the rows to import.
 *
 * Works for an export from any accounting tool (QuickBooks, Xero, FreshBooks, Zoho Books, Sage, Wave, Excel).
 * The caller reads the file, we parse it, detect which column is which, validate every row, and only then
 * (a separate confirm step) hand the good rows to csvAdapter() and runSync(). Pure and deterministic.
 */
import { createHash } from 'node:crypto';
import { parseCsv } from '../csv-parse.ts';
import type { ProviderAdapter, AdapterCustomer, AdapterInvoice, AdapterInvoiceState } from './adapter.ts';

export const CSV_MAX_BYTES = 5 * 1024 * 1024;
export const CSV_MAX_ROWS = 5000;

export { FIELDS, FIELD_LABEL, type Field, type Mapping } from './csv-fields.ts';
import { FIELDS, FIELD_LABEL, type Field, type Mapping } from './csv-fields.ts';
export type DateFormat = 'auto' | 'mdy' | 'dmy';

/* ------------------------------ column detection ------------------------------ */

const norm = (h: string): string => h.toLowerCase().replace(/^\*/, '').replace(/[^a-z0-9]/g, '');

/** Exact (normalised) header names, best first. Covers the headers the common exports use. */
const SYNONYMS: Record<Field, string[]> = {
  invoiceNumber: ['invoicenumber', 'invoiceno', 'invoice', 'invoiceid', 'num', 'docnumber', 'documentnumber', 'invno', 'number', 'no', 'invoiceref', 'reference', 'ref'],
  customerName: ['customername', 'customer', 'contactname', 'contact', 'clientname', 'client', 'customerdisplayname', 'displayname', 'name', 'companyname', 'company', 'accountname'],
  customerEmail: ['customeremail', 'email', 'emailaddress', 'contactemail', 'clientemail', 'billingemail'],
  balance: ['balance', 'amountdue', 'openbalance', 'amountoutstanding', 'outstanding', 'balancedue', 'outstandingamount', 'amountremaining', 'unpaid', 'duebalance', 'amountowing'],
  amount: ['total', 'totalamount', 'invoicetotal', 'invoiceamount', 'amount', 'grosstotal', 'gross', 'grandtotal', 'totalgross', 'originalamount', 'totalinclusive'],
  currency: ['currency', 'currencycode', 'curr', 'currencyname'],
  issueDate: ['invoicedate', 'issuedate', 'dateissued', 'date', 'issued', 'transactiondate', 'txndate', 'documentdate', 'created', 'createddate'],
  dueDate: ['duedate', 'datedue', 'paymentdue', 'paymentduedate', 'due', 'duedatetime'],
  status: ['status', 'invoicestatus', 'paymentstatus', 'state'],
};
const ASSIGN_ORDER: Field[] = ['invoiceNumber', 'customerName', 'customerEmail', 'balance', 'amount', 'currency', 'issueDate', 'dueDate', 'status'];

export function detectMapping(headers: string[]): Mapping {
  const normed = headers.map(norm);
  const used = new Set<number>();
  const mapping: Mapping = {};
  for (const field of ASSIGN_ORDER) {
    for (const syn of SYNONYMS[field]) {
      const idx = normed.findIndex((h, i) => h === syn && !used.has(i));
      if (idx >= 0) { mapping[field] = idx; used.add(idx); break; }
    }
    if (mapping[field] === undefined) mapping[field] = null;
  }
  return mapping;
}

/** A best guess at the source, for a friendly "Looks like a Xero export" line. Never relied on for parsing. */
export function guessSource(headers: string[]): string | null {
  const h = new Set(headers.map(norm));
  if (h.has('contactname') && h.has('invoicenumber')) return 'Xero';
  if (h.has('openbalance') && h.has('num')) return 'QuickBooks';
  if (h.has('dateissued') || (h.has('clientname') && h.has('invoice'))) return 'FreshBooks';
  if (h.has('currencycode') && h.has('invoicestatus') && h.has('customername')) return 'Zoho Books';
  if (h.has('outstanding') && (h.has('gross') || h.has('invoiceno'))) return 'Sage';
  if (h.has('amountdue') && h.has('customer') && h.has('invoicenumber')) return 'Wave';
  return null;
}

/* ------------------------------ value parsing ------------------------------ */

const clean = (v: string | undefined, max: number): string => (v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

/** "$1,200.50", "1.200,50", "(45.00)", "£ 3 000" -> number, or null. Parentheses and a leading minus mean negative. */
export function parseMoney(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  // A 3-letter currency code may sit at either end; any other letter makes it not a number.
  s = s.replace(/^[A-Za-z]{3}(?=[\s \d$£€¥(-])/, '').replace(/(?<=[\d)])[\s ]*[A-Za-z]{3}$/, '').replace(/[$£€¥\s ]/g, '');
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1); } else if (s.endsWith('-')) { neg = !neg; s = s.slice(0, -1); }
  if (!/^[0-9.,']+$/.test(s) || !/[0-9]/.test(s)) return null;
  s = s.replace(/'/g, '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  const dots = s.split('.').length - 1;
  const commas = s.split(',').length - 1;
  let dec: '.' | ',' | '' = '';
  if (lastDot >= 0 && lastComma >= 0) dec = lastDot > lastComma ? '.' : ',';
  else if (lastComma >= 0) dec = commas === 1 && /,\d{1,2}$/.test(s) ? ',' : '';
  else if (lastDot >= 0) dec = dots === 1 ? '.' : '';
  let out: string;
  if (dec === '.') out = s.replace(/,/g, '');
  else if (dec === ',') out = s.replace(/\./g, '').replace(',', '.');
  else out = s.replace(/[.,]/g, '');
  const n = Number(out);
  if (!Number.isFinite(n) || n > 1e12) return null;
  return neg ? -n : n;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function mkDate(y: number, m: number, d: number): Date | null {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt : null;
}
const fullYear = (y: number): number => (y < 100 ? (y < 70 ? 2000 + y : 1900 + y) : y);

/** Day-first or month-first for a numeric date like 03/04/2026; null when the text is not numeric d/m/y. */
function numericParts(s: string): [number, number, number] | null {
  const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})(?:[ T].*)?$/);
  return m ? [Number(m[1]), Number(m[2]), fullYear(Number(m[3]))] : null;
}

/** Which order the file uses, from evidence in its date cells (a part over 12 settles it). */
export function inferDateFormat(values: string[]): { format: 'mdy' | 'dmy'; assumed: boolean } {
  let dmy = 0, mdy = 0;
  for (const v of values) {
    const p = numericParts(v.trim());
    if (!p) continue;
    if (p[0] > 12 && p[1] <= 12) dmy++;
    else if (p[1] > 12 && p[0] <= 12) mdy++;
  }
  if (dmy > 0 && mdy === 0) return { format: 'dmy', assumed: false };
  if (mdy > 0 && dmy === 0) return { format: 'mdy', assumed: false };
  return { format: 'mdy', assumed: true };
}

export function parseDate(raw: string, format: 'mdy' | 'dmy'): Date | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/);
  if (m) return mkDate(Number(m[1]), Number(m[2]), Number(m[3]));
  const p = numericParts(s);
  if (p) return format === 'dmy' ? mkDate(p[2], p[1], p[0]) : mkDate(p[2], p[0], p[1]);
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-/]+([A-Za-z]{3,9})\.?,?[\s\-/]+(\d{2}|\d{4})$/);
  if (m) { const mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()); return mo >= 0 ? mkDate(fullYear(Number(m[3])), mo + 1, Number(m[1])) : null; }
  m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2}|\d{4})$/);
  if (m) { const mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()); return mo >= 0 ? mkDate(fullYear(Number(m[3])), mo + 1, Number(m[2])) : null; }
  if (/^\d{5}(\.\d+)?$/.test(s)) { // Excel serial day number
    const n = Math.floor(Number(s));
    if (n > 20000 && n < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000); return mkDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
  }
  return null;
}

function stateFromText(raw: string): AdapterInvoiceState | null {
  const s = raw.toLowerCase();
  if (!s.trim()) return null;
  if (/void|cancel/.test(s)) return 'voided';
  if (/delet/.test(s)) return 'deleted';
  if (/draft/.test(s)) return 'draft';
  if (/unpaid|partial|part paid|outstanding|overdue|open|sent|viewed/.test(s)) return 'open';
  if (/paid|settled|closed/.test(s)) return 'paid';
  return null;
}

/* ------------------------------ row checks ------------------------------ */

export type CsvRow = {
  rowNumber: number; // line in the file, header = 1
  invoiceNumber: string; customerName: string; customerEmail: string | null;
  amount: number; balance: number; currency: string; issueDate: Date; dueDate: Date; state: AdapterInvoiceState;
};
export type RowIssue = { row: number; message: string };

export type CsvAnalysis = {
  headers: string[];
  mapping: Mapping;
  source: string | null;
  dateFormat: 'mdy' | 'dmy';
  dateFormatAssumed: boolean;
  totalRows: number;
  good: CsvRow[];
  errors: RowIssue[];
  warnings: RowIssue[];
  /** Rows that will be skipped because they are already paid / void / draft and not in Mugavi yet. Known only at import time. */
  fatal: string | null;
  truncated: boolean;
  /** What the importer assumed, in plain words. */
  notes: string[];
};

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export function analyzeCsv(text: string, opts: { mapping?: Mapping; dateFormat?: DateFormat; defaultCurrency?: string } = {}): CsvAnalysis {
  const empty = (fatal: string, headers: string[] = [], mapping: Mapping = {}): CsvAnalysis => ({
    headers, mapping, source: null, dateFormat: 'mdy', dateFormatAssumed: false, totalRows: 0, good: [], errors: [], warnings: [], fatal, truncated: false, notes: [],
  });
  if (text.length > CSV_MAX_BYTES * 1.1) return empty('The file is larger than 5 MB. Split it into smaller files.');
  const parsed = parseCsv(text, { maxRows: CSV_MAX_ROWS });
  if (parsed.rows.length === 0) return empty('The file is empty.');
  const headers = parsed.rows[0].map((h) => clean(h, 120));
  if (parsed.truncated) return empty(`The file has more than ${CSV_MAX_ROWS} rows. Split it into files of ${CSV_MAX_ROWS} rows or fewer.`, headers);
  const dataRows = parsed.rows.slice(1);
  if (dataRows.length === 0) return empty('The file has a header row but no invoices.', headers);

  const mapping: Mapping = { ...detectMapping(headers), ...(opts.mapping ?? {}) };
  // A user mapping may point past the header; ignore it rather than read undefined.
  for (const f of FIELDS) { const i = mapping[f]; if (typeof i === 'number' && (i < 0 || i >= headers.length)) mapping[f] = null; }
  const notes: string[] = [];
  const col = (f: Field): number | null => (typeof mapping[f] === 'number' ? (mapping[f] as number) : null);
  const missing: string[] = [];
  if (col('invoiceNumber') === null) missing.push(FIELD_LABEL.invoiceNumber);
  if (col('customerName') === null) missing.push(FIELD_LABEL.customerName);
  if (col('amount') === null && col('balance') === null) missing.push('Amount or Balance');
  if (col('issueDate') === null && col('dueDate') === null) missing.push('Issue date or Due date');
  const base = { headers, mapping, source: guessSource(headers), totalRows: dataRows.length, truncated: false };
  if (missing.length) return { ...empty(`Pick a column for: ${missing.join(', ')}.`, headers, mapping), ...base };

  const cell = (r: string[], f: Field): string => { const c = col(f); return c === null ? '' : (r[c] ?? ''); };

  let dateFormat: 'mdy' | 'dmy'; let assumed = false;
  if (opts.dateFormat === 'mdy' || opts.dateFormat === 'dmy') dateFormat = opts.dateFormat;
  else {
    const inf = inferDateFormat(dataRows.flatMap((r) => [cell(r, 'issueDate'), cell(r, 'dueDate')]));
    dateFormat = inf.format; assumed = inf.assumed;
  }
  if (assumed) notes.push('Dates like 03/04/2026 are read as month/day/year. Switch the date format if your file is day/month/year.');
  if (col('balance') === null) notes.push('No balance column, so each invoice is treated as fully unpaid.');
  if (col('amount') === null) notes.push('No amount column, so the balance is used as the invoice amount.');
  if (col('dueDate') === null) notes.push('No due date column, so the issue date is used as the due date.');
  if (col('issueDate') === null) notes.push('No issue date column, so the due date is used as the issue date.');
  const defCur = /^[A-Za-z]{3}$/.test(opts.defaultCurrency ?? '') ? (opts.defaultCurrency as string).toUpperCase() : 'USD';
  if (col('currency') === null) notes.push(`No currency column, so every invoice is ${defCur}.`);

  const good: CsvRow[] = [];
  const errors: RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const seen = new Map<string, number>();
  dataRows.forEach((r, i) => {
    const rowNumber = i + 2;
    if (r.every((c) => !c.trim())) return;
    const bad = (m: string) => errors.push({ row: rowNumber, message: m });
    const invoiceNumber = clean(cell(r, 'invoiceNumber'), 100);
    const customerName = clean(cell(r, 'customerName'), 200);
    if (!invoiceNumber) return bad('Invoice number is empty.');
    if (!customerName) return bad('Customer name is empty.');

    const amtRaw = cell(r, 'amount').trim(); const balRaw = cell(r, 'balance').trim();
    let amount = amtRaw ? parseMoney(amtRaw) : null;
    let balance = balRaw ? parseMoney(balRaw) : null;
    if (amtRaw && amount === null) return bad(`Amount "${clean(amtRaw, 30)}" is not a number.`);
    if (balRaw && balance === null) return bad(`Balance "${clean(balRaw, 30)}" is not a number.`);
    if (amount === null && balance === null) return bad('No amount or balance on this row.');
    if (amount === null) amount = balance;
    if (balance === null) balance = col('balance') === null ? amount : null;
    if (balance === null) balance = amount; // balance cell empty: nothing known to be paid
    if ((amount as number) < 0 || (balance as number) < 0) return bad('Negative amount (a credit note?). Credit notes are not imported.');
    if ((balance as number) > (amount as number) + 0.005) return bad('Balance is larger than the amount.');

    const issueRaw = cell(r, 'issueDate'); const dueRaw = cell(r, 'dueDate');
    let issue = issueRaw.trim() ? parseDate(issueRaw, dateFormat) : null;
    let due = dueRaw.trim() ? parseDate(dueRaw, dateFormat) : null;
    if (issueRaw.trim() && !issue) return bad(`Issue date "${clean(issueRaw, 30)}" is not a date I can read.`);
    if (dueRaw.trim() && !due) return bad(`Due date "${clean(dueRaw, 30)}" is not a date I can read.`);
    if (!issue && !due) return bad('No issue date or due date on this row.');
    if (!issue) issue = due; if (!due) due = issue;

    let currency = defCur;
    const curRaw = clean(cell(r, 'currency'), 10).toUpperCase();
    if (curRaw) { if (!/^[A-Z]{3}$/.test(curRaw)) return bad(`Currency "${curRaw}" is not a 3-letter code like USD or GBP.`); currency = curRaw; }

    let email: string | null = clean(cell(r, 'customerEmail'), 200).toLowerCase() || null;
    if (email && !EMAIL_RE.test(email)) { warnings.push({ row: rowNumber, message: `Email "${clean(email, 40)}" does not look right, so it was left out.` }); email = null; }

    let state: AdapterInvoiceState = (balance as number) <= 0.005 ? 'paid' : 'open';
    const st = stateFromText(cell(r, 'status'));
    if (st === 'voided' || st === 'deleted' || st === 'draft') state = st;
    else if (st === 'paid' && col('balance') === null) { state = 'paid'; balance = 0; }

    const key = `${invoiceNumber.toLowerCase()}\u0000${customerName.toLowerCase()}`;
    const prev = seen.get(key);
    if (prev !== undefined) return bad(`Same invoice number and customer as row ${prev}.`);
    seen.set(key, rowNumber);
    good.push({ rowNumber, invoiceNumber, customerName, customerEmail: email, amount: amount as number, balance: state === 'paid' ? 0 : (balance as number), currency, issueDate: issue as Date, dueDate: due as Date, state });
  });

  return { headers, mapping, source: guessSource(headers), dateFormat, dateFormatAssumed: assumed, totalRows: dataRows.length, good, errors, warnings, fatal: null, truncated: false, notes };
}

/* ------------------------------ the adapter ------------------------------ */

const hash = (s: string): string => createHash('sha256').update(s).digest('hex').slice(0, 24);
const customerKey = (name: string): string => name.toLowerCase().replace(/\s+/g, ' ').trim();

/** Stable ids: re-importing the same invoice number for the same customer name lands on the same row. Stored as "csv:inv:..." / "csv:cus:...". */
export const csvCustomerId = (name: string): string => `cus:${hash(customerKey(name))}`;
export const csvInvoiceId = (invoiceNumber: string, customerName: string): string => `inv:${hash(`${invoiceNumber.toLowerCase().trim()}\u0000${customerKey(customerName)}`)}`;

export function csvAdapter(rows: CsvRow[]): ProviderAdapter {
  const customers = new Map<string, AdapterCustomer>();
  for (const r of rows) {
    const id = csvCustomerId(r.customerName);
    const have = customers.get(id);
    if (!have) customers.set(id, { id, name: r.customerName, email: r.customerEmail });
    else if (!have.email && r.customerEmail) have.email = r.customerEmail;
  }
  const customerList = [...customers.values()];
  const invoiceList: AdapterInvoice[] = rows.map((r) => ({
    id: csvInvoiceId(r.invoiceNumber, r.customerName), number: r.invoiceNumber, customerId: csvCustomerId(r.customerName), customerName: r.customerName,
    total: r.amount, balance: r.balance, currency: r.currency, issueDate: r.issueDate, dueDate: r.dueDate, state: r.state,
  }));
  const PAGE = 500;
  const slice = <T,>(list: T[], page: number): T[] => list.slice((page - 1) * PAGE, page * PAGE);
  return {
    id: 'csv',
    label: 'Spreadsheet (CSV)',
    pageSize: PAGE,
    maxPages: Math.ceil(CSV_MAX_ROWS / PAGE) + 1,
    reconcileMissing: false,
    supportsCredits: false,
    configured: () => true,
    connectUrl: () => '/dashboard/integrations/import',
    listCustomers: async (_o, page) => slice(customerList, page),
    listOpenInvoices: async (_o, page) => slice(invoiceList, page),
    listCredits: async () => [],
    disconnect: async () => {},
  };
}
