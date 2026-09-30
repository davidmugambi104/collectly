/**
 * Aged receivables by customer: what each customer owes, split by how late it
 * is. Same columns and order as the report bookkeepers already open in Xero and
 * QuickBooks (not due, 1-30, 31-60, 61-90, 90+), so it reads without a legend.
 *
 * Pure, so the buckets can be tested. The day count and the edges match
 * bucketFor() in utils.ts: 0 or fewer days is "not due", 1-30, 31-60, 61-90,
 * then 91 and over. Money is added in whole cents so totals never drift.
 */
export const AGED_BUCKETS = ['current', '1-30', '31-60', '61-90', '90+'] as const;
export type AgedBucket = (typeof AGED_BUCKETS)[number];

/** Owed and still chasable or at least owed. Drafts are not owed yet; paid and written-off are closed. */
export const NOT_OWED = new Set(['draft', 'paid', 'written_off']);

export type AgedInvoice = {
  customerId: string;
  customerName: string;
  currency: string;
  status: string;
  amount: string | number;
  amountPaid: string | number | null;
  dueDate: Date | string;
};

export type AgedRow = {
  customerId: string;
  customer: string;
  currency: string;
  /** Cents in each bucket, in AGED_BUCKETS order. */
  buckets: number[];
  total: number;
  overdue: number;
  unpaidCount: number;
  oldestDaysOverdue: number;
};

export type AgedReport = {
  rows: AgedRow[];
  /** One totals row per currency, because adding dollars to pounds is not a number anyone wants. */
  totals: { currency: string; buckets: number[]; total: number; overdue: number; unpaidCount: number }[];
};

const cents = (v: string | number | null | undefined) => Math.round(Number(v ?? 0) * 100);

export function daysPastDue(dueDate: Date | string, now: Date): number {
  return Math.floor((now.getTime() - new Date(dueDate).getTime()) / 86_400_000);
}

export function agedBucketIndex(days: number): number {
  if (days <= 0) return 0;
  if (days <= 30) return 1;
  if (days <= 60) return 2;
  if (days <= 90) return 3;
  return 4;
}

export function buildAgedReport(invoices: AgedInvoice[], now: Date): AgedReport {
  const rows = new Map<string, AgedRow>();
  const totals = new Map<string, AgedReport['totals'][number]>();
  for (const inv of invoices) {
    if (NOT_OWED.has(inv.status)) continue;
    const balance = cents(inv.amount) - cents(inv.amountPaid);
    if (balance <= 0) continue;
    const days = daysPastDue(inv.dueDate, now);
    const i = agedBucketIndex(days);

    const key = `${inv.customerId}|${inv.currency}`;
    const row = rows.get(key) ?? { customerId: inv.customerId, customer: inv.customerName, currency: inv.currency, buckets: [0, 0, 0, 0, 0], total: 0, overdue: 0, unpaidCount: 0, oldestDaysOverdue: 0 };
    row.buckets[i] += balance; row.total += balance; row.unpaidCount += 1;
    if (i > 0) row.overdue += balance;
    row.oldestDaysOverdue = Math.max(row.oldestDaysOverdue, days);
    rows.set(key, row);

    const t = totals.get(inv.currency) ?? { currency: inv.currency, buckets: [0, 0, 0, 0, 0], total: 0, overdue: 0, unpaidCount: 0 };
    t.buckets[i] += balance; t.total += balance; t.unpaidCount += 1;
    if (i > 0) t.overdue += balance;
    totals.set(inv.currency, t);
  }
  return {
    // Biggest debt first, then by name, so the top of the report is where the money is.
    rows: [...rows.values()].sort((a, b) => b.total - a.total || a.customer.localeCompare(b.customer)),
    totals: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
  };
}

export const money = (c: number) => (c / 100).toFixed(2);
