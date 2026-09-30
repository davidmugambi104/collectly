/**
 * Late fees as they appear under a reminder email. Written by us from the fee
 * ledger, never by the AI, and always as their own lines: the invoice amount in
 * the message is the invoice's own, and the fees and the new total are shown
 * separately so nobody can read a fee as part of the original invoice.
 */
import { formatMoney } from './statements.ts';

export type FeeLine = { invoiceNumber: string; amountCents: number; currency: string; period: number };

export type FeesSummary = {
  rows: Array<{ label: string; amount: string }>;
  moreCount: number;
  count: number;
  feesTotal: string;
  /** What was owed before fees, plus the fees. */
  total: string;
  feesCents: number;
  totalCents: number;
};

export const MAX_FEE_ROWS = 10;

/** Fees in `currency` only, added to `baseCents` (the invoice balance, plus the others if they are listed). Null when there are none. */
export function summariseFees(fees: FeeLine[], currency: string, baseCents: number): FeesSummary | null {
  const usable = fees.filter((f) => f.currency === currency && f.amountCents > 0).sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber) || a.period - b.period);
  if (usable.length === 0) return null;
  const feesCents = usable.reduce((s, f) => s + f.amountCents, 0);
  const shown = usable.slice(0, MAX_FEE_ROWS);
  return {
    rows: shown.map((f) => ({ label: `Late fee on ${f.invoiceNumber}${f.period > 0 ? ` (month ${f.period + 1})` : ''}`, amount: formatMoney(f.amountCents, currency) })),
    moreCount: usable.length - shown.length,
    count: usable.length,
    feesTotal: formatMoney(feesCents, currency),
    total: formatMoney(baseCents + feesCents, currency),
    feesCents,
    totalCents: baseCents + feesCents,
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderFeesHtml(s: FeesSummary): string {
  const td = 'padding:6px 10px;border-bottom:1px solid #eeeef0;';
  const rows = s.rows.map((r) => `<tr><td style="${td}">${esc(r.label)}</td><td style="${td}text-align:right;">${esc(r.amount)}</td></tr>`).join('');
  const more = s.moreCount > 0 ? `<tr><td colspan="2" style="${td}color:#6c6e76;">and ${s.moreCount} more late fee${s.moreCount === 1 ? '' : 's'}</td></tr>` : '';
  return `
      <p style="font-size: 14px; margin: 20px 0 6px;"><strong>${s.count === 1 ? 'A late fee has been added' : 'Late fees have been added'}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">${rows}${more}</table>
      <p style="font-size: 14px; margin: 10px 0 0;">Total owed, including late fees: <strong>${esc(s.total)}</strong></p>`;
}

/** One line for the approval queue. */
export function describeFees(s: FeesSummary): string {
  return `Includes ${s.count} late fee${s.count === 1 ? '' : 's'} (${s.feesTotal}); ${s.total} in all.`;
}
