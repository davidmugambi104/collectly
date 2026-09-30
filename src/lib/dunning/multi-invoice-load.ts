/**
 * The database half of multi-invoice reminders. See multi-invoice.ts for the
 * rules. Callers run ensureDunningControlSchema first (the setting is a column
 * that creates itself).
 */
import { and, eq, lt, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dunningSettings, inboxMessages, invoices, promisesToPay } from '@/db/schema';
import { describeOthers, renderOthersHtml, summariseOthers, type OthersSummary } from '@/lib/dunning/multi-invoice';
import { describeFees, renderFeesHtml, summariseFees } from '@/lib/late-fees-render';
import { loadOwedFees } from '@/lib/late-fees-load';

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

type ExtrasOpts = Parameters<typeof loadOthersSummary>[0] & { listOthers: boolean };

/**
 * Everything we add under a reminder, worked out at the moment it is sent:
 * the customer's other overdue invoices (if the org lists them), then any late
 * fees that are owed, each as its own lines. Fees on the invoice being chased
 * always appear; fees on the customer's other invoices appear only when the
 * others are listed too, so the total always matches what is on screen.
 */
async function loadExtras(opts: ExtrasOpts) {
  const others = opts.listOthers ? await loadOthersSummary(opts) : null;
  const owed = await loadOwedFees(opts.orgId, opts.customerId);
  const relevant = others ? owed : owed.filter((f) => f.invoiceId === opts.invoiceId);
  const base = Math.round(opts.thisBalance * 100) + (others?.othersCents ?? 0);
  const fees = summariseFees(relevant.map((f) => ({ invoiceNumber: f.invoiceNumber, amountCents: f.amountCents, currency: f.currency, period: f.period })), opts.currency, base);
  return { others, fees };
}

/** The HTML to put under a reminder. Empty when there is nothing to add. */
export async function extrasHtmlFor(opts: ExtrasOpts): Promise<string> {
  const { others, fees } = await loadExtras(opts);
  return (others ? renderOthersHtml(others) : '') + (fees ? renderFeesHtml(fees) : '');
}

/** One or two plain lines for the approval queue, so the owner sees what will be added before approving. */
export async function describeExtrasFor(opts: ExtrasOpts): Promise<string | null> {
  const { others, fees } = await loadExtras(opts);
  const lines = [others ? describeOthers(others) : null, fees ? describeFees(fees) : null].filter(Boolean);
  return lines.length ? lines.join(' ') : null;
}
