import { and, eq, notInArray } from 'drizzle-orm';
import { db } from '@/db';
import { customers, invoices } from '@/db/schema';
import { buildAgedReport, type AgedInvoice, type AgedReport } from '@/lib/aged-receivables';

/** Every invoice still owed for one organisation, as a report. Scoped by orgId in the query itself. */
export async function loadAgedReport(orgId: string, now = new Date()): Promise<AgedReport> {
  const rows: AgedInvoice[] = await db
    .select({
      customerId: customers.id,
      customerName: customers.name,
      currency: invoices.currency,
      status: invoices.status,
      amount: invoices.amount,
      amountPaid: invoices.amountPaid,
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(eq(invoices.orgId, orgId), notInArray(invoices.status, ['draft', 'paid', 'written_off'])));
  return buildAgedReport(rows, now);
}
