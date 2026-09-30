/**
 * The database half of multi-invoice reminders. See multi-invoice.ts for the
 * rules. Callers run ensureDunningControlSchema first (the setting is a column
 * that creates itself).
 */
import { and, eq, lt, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dunningSettings, inboxMessages, invoices, promisesToPay } from '@/db/schema';
import { renderOthersHtml, summariseOthers, type OthersSummary } from '@/lib/dunning/multi-invoice';

/** Whether this org's reminders list the customer's other overdue invoices. On unless switched off. */
export async function loadListOthers(orgId: string): Promise<boolean> {
  const [row] = await db.select({ on: dunningSettings.listOtherInvoices }).from(dunningSettings).where(eq(dunningSettings.orgId, orgId)).limit(1);
  return row ? row.on : true;
}

/**
 * What to add under a reminder about `invoice`, or null. Only invoices we would
 * ourselves chase today count: open, past due, with a balance, not covered by an
 * active promise to pay, and not waiting on an unread reply. A disputed invoice
 * has its own status and is left out with the rest.
 */
export async function loadOthersSummary(opts: {
  orgId: string;
  customerId: string;
  invoiceId: string;
  thisBalance: number;
  currency: string;
  now?: Date;
}): Promise<OthersSummary | null> {
  const now = opts.now ?? new Date();
  const rows = await db
    .select({ number: invoices.number, dueDate: invoices.dueDate, amount: invoices.amount, amountPaid: invoices.amountPaid, currency: invoices.currency })
    .from(invoices)
    .where(and(
      eq(invoices.orgId, opts.orgId),
      eq(invoices.customerId, opts.customerId),
      ne(invoices.id, opts.invoiceId),
      sql`${invoices.status} IN ('sent', 'viewed', 'overdue', 'partial')`,
      lt(invoices.dueDate, now),
      sql`NOT EXISTS (
        SELECT 1 FROM ${promisesToPay}
        WHERE ${promisesToPay.invoiceId} = ${invoices.id}
          AND ${promisesToPay.status} = 'active'
          AND ${promisesToPay.promisedDate} >= ${now}
      )`,
      sql`NOT EXISTS (
        SELECT 1 FROM ${inboxMessages}
        WHERE ${inboxMessages.invoiceId} = ${invoices.id}
          AND ${inboxMessages.status} = 'new'
      )`,
    ))
    .limit(200);
  return summariseOthers(
    rows.map((r: (typeof rows)[number]) => ({ number: r.number, dueDate: r.dueDate, balance: Number(r.amount) - Number(r.amountPaid ?? 0), currency: r.currency ?? 'USD' })),
    opts.thisBalance,
    opts.currency,
    now,
  );
}

/** The HTML block for a reminder, or an empty string when there is nothing to add or the org turned it off. */
export async function othersHtmlFor(opts: Parameters<typeof loadOthersSummary>[0] & { enabled: boolean }): Promise<string> {
  if (!opts.enabled) return '';
  const s = await loadOthersSummary(opts);
  return s ? renderOthersHtml(s) : '';
}
