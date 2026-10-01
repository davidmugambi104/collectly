/**
 * A customer statement: every open invoice for one customer, what is paid on
 * each, what is left, and how late it is, with totals. Built from the same
 * rules as the aged receivables report (same buckets, same "what counts as
 * owed"), so the two can never disagree.
 *
 * Pure: no database, no sending. Money is added in whole cents, and each
 * currency gets its own section because a total across currencies is wrong.
 * Everything that ends up in HTML or CSV is escaped.
 */
import { AGED_BUCKETS, NOT_OWED, agedBucketIndex, daysPastDue, type AgedBucket } from './aged-receivables.ts';

export type StatementInvoice = {
  number: string;
  currency: string;
  status: string;
  issueDate: Date | string;
  dueDate: Date | string;
  amount: string | number;
  amountPaid: string | number | null;
};

export type StatementRow = {
  number: string;
  issued: Date;
  due: Date;
  amountCents: number;
  paidCents: number;
  balanceCents: number;
  /** Zero or negative means not yet due. */
  daysOverdue: number;
  bucket: AgedBucket;
  disputed: boolean;
};

/** A late fee the owner applied and that is still owed. Its own line: it never changes an invoice's amount. */
export type StatementFee = { invoiceNumber: string; amountCents: number; currency: string; period: number };

export type StatementSection = {
  currency: string;
  rows: StatementRow[];
  fees: StatementFee[];
  /** Sum of `fees`. Included in totalCents and overdueCents. */
  feesCents: number;
  /** Cents per bucket, in AGED_BUCKETS order. Invoices only; fees are counted in feesCents. */
  bucketsCents: number[];
  /** Invoice balances plus late fees. */
  totalCents: number;
  overdueCents: number;
};

export type Statement = { asOf: Date; sections: StatementSection[] };

const cents = (v: string | number | null | undefined) => Math.round(Number(v ?? 0) * 100);

/** Invoices the customer still owes on, grouped by currency. No sections means nothing is owed. */
export function buildStatement(invoices: StatementInvoice[], asOf: Date, fees: StatementFee[] = []): Statement {
  const by = new Map<string, StatementSection>();
  const blank = (currency: string): StatementSection => ({ currency, rows: [], fees: [], feesCents: 0, bucketsCents: [0, 0, 0, 0, 0], totalCents: 0, overdueCents: 0 });
  for (const inv of invoices) {
    if (NOT_OWED.has(inv.status)) continue;
    const amountCents = cents(inv.amount);
    const paidCents = cents(inv.amountPaid);
    const balanceCents = amountCents - paidCents;
    if (balanceCents <= 0) continue;
    const days = daysPastDue(inv.dueDate, asOf);
    const i = agedBucketIndex(days);
    const sec = by.get(inv.currency) ?? blank(inv.currency);
    sec.rows.push({
      number: inv.number, issued: new Date(inv.issueDate), due: new Date(inv.dueDate),
      amountCents, paidCents, balanceCents, daysOverdue: days, bucket: AGED_BUCKETS[i], disputed: inv.status === 'disputed',
    });
    sec.bucketsCents[i] += balanceCents;
    sec.totalCents += balanceCents;
    if (i > 0) sec.overdueCents += balanceCents;
    by.set(inv.currency, sec);
  }
  for (const f of fees) {
    if (f.amountCents <= 0) continue;
    const sec = by.get(f.currency) ?? blank(f.currency);
    sec.fees.push(f);
    sec.feesCents += f.amountCents;
    sec.totalCents += f.amountCents;
    sec.overdueCents += f.amountCents; // a fee exists only because something was late
    by.set(f.currency, sec);
  }
  const sections = [...by.values()].sort((a, b) => a.currency.localeCompare(b.currency));
  for (const s of sections) { s.fees.sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber) || a.period - b.period); }
  for (const s of sections) s.rows.sort((a, b) => a.due.getTime() - b.due.getTime() || a.number.localeCompare(b.number));
  return { asOf, sections };
}

export function formatMoney(amountCents: number, currency: string): string {
  const n = amountCents / 100;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

/** Dates are shown in UTC so the same statement reads the same wherever it is opened. */
export function formatStatementDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d);
}

export function statementSubject(businessName: string | null | undefined, asOf: Date): string {
  const who = (businessName ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 80);
  return `${who ? `Statement from ${who}` : 'Statement of account'}, ${formatStatementDate(asOf)}`;
}

export const BUCKET_LABELS: Record<AgedBucket, string> = { current: 'Not yet due', '1-30': '1 to 30 days', '31-60': '31 to 60 days', '61-90': '61 to 90 days', '90+': 'Over 90 days' };

/** One line for screens: "$1,550.50 owed, $350.00 of it overdue". Empty string when nothing is owed. */
export function describeStatement(s: Statement): string {
  return s.sections
    .map((x) => `${formatMoney(x.totalCents, x.currency)} owed${x.feesCents > 0 ? ` (including ${formatMoney(x.feesCents, x.currency)} in late fees)` : ''}${x.overdueCents > 0 ? `, ${formatMoney(x.overdueCents, x.currency)} of it overdue` : ''}`)
    .join('; ');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The statement as an email body. `note` is the owner's own words, shown above the table. */
export const MAX_FOOTER_CHARS = 1000;

/** Normalise the owner's payment details: line endings, control characters, length. Empty becomes null. */
export function cleanFooter(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const t = input.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, MAX_FOOTER_CHARS);
  return t || null;
}

export function renderStatementHtml(o: { customerName: string; businessName: string; statement: Statement; note?: string | null; footer?: string | null }): string {
  const td = 'padding:6px 8px;border-bottom:1px solid #eeeef0;';
  const th = `${td}font-weight:600;text-align:left;`;
  const sections = o.statement.sections.map((sec) => {
    const rows = sec.rows.map((r) => `<tr>
        <td style="${td}">${esc(r.number)}${r.disputed ? ' <span style="color:#6c6e76;">(in dispute)</span>' : ''}</td>
        <td style="${td}">${esc(formatStatementDate(r.issued))}</td>
        <td style="${td}">${esc(formatStatementDate(r.due))}</td>
        <td style="${td}text-align:right;">${esc(formatMoney(r.amountCents, sec.currency))}</td>
        <td style="${td}text-align:right;">${esc(formatMoney(r.paidCents, sec.currency))}</td>
        <td style="${td}text-align:right;">${esc(formatMoney(r.balanceCents, sec.currency))}</td>
        <td style="${td}text-align:right;">${r.daysOverdue > 0 ? `${r.daysOverdue} days late` : 'not yet due'}</td>
      </tr>`).join('');
    const aging = AGED_BUCKETS.map((b, i) => sec.bucketsCents[i] > 0 ? `${esc(BUCKET_LABELS[b])}: ${esc(formatMoney(sec.bucketsCents[i], sec.currency))}` : '').filter(Boolean).join(' &middot; ');
    return `
      <h3 style="font-size:14px;margin:22px 0 6px;">Invoices in ${esc(sec.currency)}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><th style="${th}">Invoice</th><th style="${th}">Issued</th><th style="${th}">Due</th><th style="${th}text-align:right;">Amount</th><th style="${th}text-align:right;">Paid</th><th style="${th}text-align:right;">Balance</th><th style="${th}text-align:right;">Status</th></tr>
        ${rows}
        ${sec.rows.length > 0 && sec.feesCents > 0 ? `<tr><td colspan="5" style="${td}">Invoices</td><td style="${td}text-align:right;">${esc(formatMoney(sec.totalCents - sec.feesCents, sec.currency))}</td><td style="${td}"></td></tr>` : ''}
        ${sec.fees.map((f) => `<tr><td colspan="5" style="${td}">Late fee on ${esc(f.invoiceNumber)}${f.period > 0 ? ` (month ${f.period + 1})` : ''}</td><td style="${td}text-align:right;">${esc(formatMoney(f.amountCents, sec.currency))}</td><td style="${td}"></td></tr>`).join('')}
        <tr><td colspan="5" style="${td}font-weight:600;">${sec.feesCents > 0 ? 'Total owed, including late fees' : 'Total owed'}</td><td style="${td}font-weight:600;text-align:right;">${esc(formatMoney(sec.totalCents, sec.currency))}</td><td style="${td}"></td></tr>
      </table>
      <p style="font-size:13px;margin:8px 0 0;color:#6c6e76;">${aging}</p>`;
  }).join('');
  const body = o.statement.sections.length === 0
    ? '<p style="font-size:14px;">Nothing is owed on your account at the moment.</p>'
    : sections;
  const note = o.note?.trim() ? `<p style="font-size:15px;line-height:1.6;white-space:pre-wrap;">${esc(o.note.trim())}</p>` : '';
  return `
    <!doctype html>
    <html><body style="font-family: -apple-system, system-ui, sans-serif; color: #16171c; max-width: 640px; margin: 0 auto; padding: 24px;">
      <h2 style="font-size:18px;margin:0 0 4px;">Statement of account</h2>
      <p style="font-size:13px;color:#6c6e76;margin:0 0 16px;">${esc(o.businessName)} for ${esc(o.customerName)}, as of ${esc(formatStatementDate(o.statement.asOf))}</p>
      ${note}${body}
      ${o.footer?.trim() ? `<hr style="border:0;border-top:1px solid #eeeef0;margin:24px 0 12px;" /><p style="font-size:13px;line-height:1.6;white-space:pre-wrap;"><strong>How to pay</strong>\n${esc(o.footer.trim())}</p>` : ''}
    </body></html>
  `;
}

/** Stop a spreadsheet from running a cell as a formula, then quote it. */
function csvCell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function statementCsv(s: Statement): string {
  const lines = [['Invoice', 'Currency', 'Issued', 'Due', 'Amount', 'Paid', 'Balance', 'Days overdue', 'Age bucket', 'In dispute'].join(',')];
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  for (const sec of s.sections) {
    for (const f of sec.fees) {
      lines.push([`Late fee on ${f.invoiceNumber}`, sec.currency, '', '', (f.amountCents / 100).toFixed(2), '0.00', (f.amountCents / 100).toFixed(2), '', 'late fee', 'no'].map(csvCell).join(','));
    }
    for (const r of sec.rows) {
      lines.push([r.number, sec.currency, iso(r.issued), iso(r.due), (r.amountCents / 100).toFixed(2), (r.paidCents / 100).toFixed(2), (r.balanceCents / 100).toFixed(2), Math.max(0, r.daysOverdue), r.bucket, r.disputed ? 'yes' : 'no'].map(csvCell).join(','));
    }
  }
  return lines.join('\n') + '\n';
}
