import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { buildStatement, type Statement } from '@/lib/statements';

/** The customer's statement as of now, from their invoices in this organisation. */
export async function loadStatement(orgId: string, customerId: string, asOf: Date = new Date()): Promise<Statement> {
  const rows = await db
    .select({ number: invoices.number, currency: invoices.currency, status: invoices.status, issueDate: invoices.issueDate, dueDate: invoices.dueDate, amount: invoices.amount, amountPaid: invoices.amountPaid })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), eq(invoices.customerId, customerId)))
    .limit(2000);
  return buildStatement(rows, asOf);
}
