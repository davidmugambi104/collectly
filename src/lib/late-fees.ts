/**
 * Late fees: the rules, kept pure so every amount can be tested.
 *
 * What this does and does not do:
 *  - It works out which invoices are due a fee under the owner's policy. It
 *    never applies one by itself: the owner reviews the proposals and applies
 *    them, and the server recomputes each amount when they do, so a number from
 *    the browser is never trusted.
 *  - A fee is its own ledger line. It never changes an invoice's amount, because
 *    invoices come from QuickBooks or Xero and an edit here would be overwritten
 *    or drift. The fee is not written back to the accounting software, and it is
 *    not added to the payment page.
 *  - Money is handled in whole cents and rounded half up. A flat fee is in one
 *    currency and only applies to invoices in that currency; a percentage fee
 *    applies to any.
 */
import { daysPastDue } from './aged-receivables.ts';

export type FeeKind = 'flat' | 'percent';

export type FeePolicy = {
  enabled: boolean;
  kind: FeeKind;
  /** Flat: an amount in `currency`. Percent: a percentage of the unpaid balance, per application. */
  value: number;
  /** The currency a flat fee is in. Ignored for percent. */
  currency: string;
  /** A fee applies once an invoice is MORE than this many days past due. */
  graceDays: number;
  /** After the first fee, add another every 30 days while the invoice stays unpaid. */
  repeatMonthly: boolean;
  /** Total fees on one invoice never exceed this percentage of the invoice amount. null = no cap. */
  capPercent: number | null;
};

export const DEFAULT_POLICY: FeePolicy = { enabled: false, kind: 'percent', value: 0, currency: 'USD', graceDays: 14, repeatMonthly: false, capPercent: null };

export const MAX_PERCENT = 25;
export const MAX_FLAT = 100_000;
export const MAX_GRACE_DAYS = 365;
/** Periods are 30 days apart; this bounds the loop and the number of fees one invoice can ever get. */
export const MAX_PERIODS = 24;
export const PERIOD_DAYS = 30;

export type PolicyResult = { ok: true; value: FeePolicy } | { ok: false; error: string };

export function parsePolicyInput(input: unknown): PolicyResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'The late fee policy must be an object.' };
  const r = input as Record<string, unknown>;
  const enabled = r.enabled === true;
  if (typeof r.enabled !== 'boolean') return { ok: false, error: 'Say whether late fees are on or off.' };
  const kind = r.kind;
  if (kind !== 'flat' && kind !== 'percent') return { ok: false, error: 'The fee must be a flat amount or a percentage.' };
  const value = Number(r.value);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: 'The fee must be more than zero.' };
  if (kind === 'percent' && value > MAX_PERCENT) return { ok: false, error: `A percentage fee cannot be more than ${MAX_PERCENT}%.` };
  if (kind === 'flat' && value > MAX_FLAT) return { ok: false, error: `A flat fee cannot be more than ${MAX_FLAT.toLocaleString('en-US')}.` };
  if (Math.round(value * 100) / 100 !== value) return { ok: false, error: 'Use at most two decimal places.' };
  const currency = typeof r.currency === 'string' ? r.currency.trim().toUpperCase() : '';
  if (kind === 'flat' && !/^[A-Z]{3}$/.test(currency)) return { ok: false, error: 'A flat fee needs a three-letter currency such as USD.' };
  const graceDays = Number(r.graceDays);
  if (!Number.isInteger(graceDays) || graceDays < 0 || graceDays > MAX_GRACE_DAYS) return { ok: false, error: `Grace days must be a whole number from 0 to ${MAX_GRACE_DAYS}.` };
  const repeatMonthly = r.repeatMonthly === true;
  let capPercent: number | null = null;
  if (r.capPercent !== null && r.capPercent !== undefined && r.capPercent !== '') {
    capPercent = Number(r.capPercent);
    if (!Number.isFinite(capPercent) || capPercent <= 0 || capPercent > 100) return { ok: false, error: 'The cap must be a percentage above 0 and up to 100.' };
    if (Math.round(capPercent * 100) / 100 !== capPercent) return { ok: false, error: 'Use at most two decimal places in the cap.' };
  }
  return { ok: true, value: { enabled, kind, value, currency: /^[A-Z]{3}$/.test(currency) ? currency : 'USD', graceDays, repeatMonthly, capPercent } };
}

/** Invoices that can be charged a fee. Drafts, paid and written-off are closed; a disputed invoice is never charged. */
export const FEE_ELIGIBLE_STATUSES = new Set(['sent', 'viewed', 'overdue', 'partial']);

export type FeeInvoice = {
  id: string;
  number: string;
  currency: string;
  status: string;
  amount: string | number;
  amountPaid: string | number | null;
  dueDate: Date | string;
};

/** A fee decision already on record. 'waived' means the owner chose not to charge it. */
export type DecidedFee = { invoiceId: string; period: number; amountCents: number; status: 'applied' | 'paid' | 'waived' };

export type ProposedFee = {
  invoiceId: string;
  invoiceNumber: string;
  /** 0 is the first fee, 1 the next 30 days later, and so on. */
  period: number;
  amountCents: number;
  currency: string;
  daysLate: number;
  /** Plain words, for the review screen. */
  reason: string;
  /** True when the cap cut this fee down. */
  capped: boolean;
};

const cents = (v: string | number | null | undefined) => Math.round(Number(v ?? 0) * 100);

/** Round half up, in whole cents, without floating-point drift. */
export function percentOfCents(baseCents: number, percent: number): number {
  return Math.round((baseCents * Math.round(percent * 100)) / 10_000);
}

export function proposeFees(policy: FeePolicy, invoices: FeeInvoice[], decided: DecidedFee[], asOf: Date): ProposedFee[] {
  if (!policy.enabled || !(policy.value > 0)) return [];
  const out: ProposedFee[] = [];
  const byInvoice = new Map<string, DecidedFee[]>();
  for (const d of decided) byInvoice.set(d.invoiceId, [...(byInvoice.get(d.invoiceId) ?? []), d]);

  for (const inv of invoices) {
    if (!FEE_ELIGIBLE_STATUSES.has(inv.status)) continue;
    const balance = cents(inv.amount) - cents(inv.amountPaid);
    if (balance <= 0) continue;
    if (policy.kind === 'flat' && inv.currency !== policy.currency) continue;

    const days = daysPastDue(inv.dueDate, asOf);
    const mine = byInvoice.get(inv.id) ?? [];
    const decidedPeriods = new Set(mine.map((d) => d.period));
    const capCents = policy.capPercent === null ? null : percentOfCents(cents(inv.amount), policy.capPercent);
    let used = mine.filter((d) => d.status !== 'waived').reduce((sum, d) => sum + d.amountCents, 0);

    const lastPeriod = policy.repeatMonthly ? MAX_PERIODS - 1 : 0;
    for (let k = 0; k <= lastPeriod; k++) {
      if (days <= policy.graceDays + PERIOD_DAYS * k) break; // not yet, and no later period is either
      if (decidedPeriods.has(k)) continue;
      let amount = policy.kind === 'flat' ? Math.round(policy.value * 100) : percentOfCents(balance, policy.value);
      if (amount <= 0) continue;
      let capped = false;
      if (capCents !== null) {
        const room = capCents - used;
        if (room <= 0) break; // the cap is reached; later periods would be refused too
        if (amount > room) { amount = room; capped = true; }
      }
      used += amount;
      out.push({
        invoiceId: inv.id, invoiceNumber: inv.number, period: k, amountCents: amount, currency: inv.currency, daysLate: days, capped,
        reason: k === 0
          ? `${days} days past due, more than the ${policy.graceDays}-day grace period`
          : `Still unpaid ${PERIOD_DAYS * k} days after the first fee became due (month ${k + 1})`,
      });
    }
  }
  return out.sort((a, b) => b.daysLate - a.daysLate || a.invoiceNumber.localeCompare(b.invoiceNumber) || a.period - b.period);
}

export function describePolicy(p: FeePolicy): string {
  if (!p.enabled) return 'Late fees are off.';
  const amt = p.kind === 'flat' ? `${p.value.toFixed(2)} ${p.currency}` : `${p.value}% of the unpaid balance`;
  const every = p.repeatMonthly ? ', and again every 30 days while it stays unpaid' : ', once';
  const cap = p.capPercent === null ? '' : `, never more than ${p.capPercent}% of the invoice in total`;
  return `${amt} once an invoice is more than ${p.graceDays} day${p.graceDays === 1 ? '' : 's'} past due${every}${cap}.`;
}
