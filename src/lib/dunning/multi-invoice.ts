/**
 * A reminder that lists the customer's other overdue invoices.
 *
 * We send one reminder per customer, not one per invoice (chase-rules.ts), so
 * that one reminder should tell them everything that is late. The list and the
 * total are written by us from the database, never by the AI, so an amount in
 * the email cannot be invented. Pure: the query lives in multi-invoice-load.ts.
 *
 * Only invoices in the same currency as the one being chased are listed or
 * added up. A total across currencies would be wrong, and converting would be
 * inventing a rate.
 */

export type OtherInvoice = { number: string; dueDate: Date | string; balance: number; currency: string };

export type OthersSummary = {
  rows: Array<{ number: string; dueLabel: string; daysOverdue: number; amount: string }>;
  /** Invoices beyond the rows shown. They are in the total. */
  moreCount: number;
  /** How many other invoices are in the total, shown or not. */
  count: number;
  currency: string;
  othersTotal: string;
  /** This invoice and all the others. */
  grandTotal: string;
  /** The same two totals in whole cents, for adding late fees on top. */
  othersCents: number;
  grandCents: number;
};

export const MAX_LISTED = 10;

const toCents = (n: number) => Math.round(n * 100);

function money(cents: number, currency: string): string {
  const n = cents / 100;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function dayLabel(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d);
}

/** Null when there is nothing to add: the reminder then goes out exactly as it always did. */
export function summariseOthers(others: OtherInvoice[], thisBalance: number, currency: string, now: Date): OthersSummary | null {
  const usable = others
    .filter((o) => o.currency === currency && toCents(o.balance) > 0)
    .map((o) => ({ ...o, due: new Date(o.dueDate) }))
    .sort((a, b) => a.due.getTime() - b.due.getTime() || a.number.localeCompare(b.number));
  if (usable.length === 0) return null;

  const othersCents = usable.reduce((sum, o) => sum + toCents(o.balance), 0);
  const shown = usable.slice(0, MAX_LISTED);
  return {
    rows: shown.map((o) => ({
      number: o.number,
      dueLabel: dayLabel(o.due),
      daysOverdue: Math.max(0, Math.floor((now.getTime() - o.due.getTime()) / 86_400_000)),
      amount: money(toCents(o.balance), currency),
    })),
    moreCount: usable.length - shown.length,
    count: usable.length,
    currency,
    othersTotal: money(othersCents, currency),
    grandTotal: money(toCents(thisBalance) + othersCents, currency),
    othersCents,
    grandCents: toCents(thisBalance) + othersCents,
  };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The block that goes under the message. */
export function renderOthersHtml(s: OthersSummary): string {
  const td = 'padding:6px 10px;border-bottom:1px solid #eeeef0;';
  const rows = s.rows
    .map((r) => `<tr><td style="${td}">${esc(r.number)}</td><td style="${td}">${esc(r.dueLabel)}</td><td style="${td}text-align:right;">${esc(r.amount)}</td></tr>`)
    .join('');
  const more = s.moreCount > 0
    ? `<tr><td colspan="3" style="${td}color:#6c6e76;">and ${s.moreCount} more invoice${s.moreCount === 1 ? '' : 's'}</td></tr>`
    : '';
  return `
      <p style="font-size: 14px; margin: 20px 0 6px;"><strong>${s.count === 1 ? 'Another invoice is also overdue' : `${s.count} other invoices are also overdue`}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><th align="left" style="${td}">Invoice</th><th align="left" style="${td}">Due</th><th align="right" style="${td}">Balance</th></tr>
        ${rows}${more}
      </table>
      <p style="font-size: 14px; margin: 10px 0 0;">Everything overdue, including this invoice: <strong>${esc(s.grandTotal)}</strong></p>`;
}

/** One line for the approval queue, so the owner sees what will be added before they approve. */
export function describeOthers(s: OthersSummary): string {
  return `Also lists ${s.count} other overdue invoice${s.count === 1 ? '' : 's'} (${s.othersTotal}); ${s.grandTotal} overdue in all.`;
}
