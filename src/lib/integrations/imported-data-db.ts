/** The database side of imported-data.ts: preview what a Xero sync left, and remove it. Always scoped to one organization. */
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { customers, invoices } from '@/db/schema';
import { XERO_ID_PATTERN, type ImportedSummary } from '@/lib/integrations/imported-data';

const xeroInvoice = (orgId: string) => and(eq(invoices.orgId, orgId), sql`${invoices.externalId} ~* ${XERO_ID_PATTERN}`);
const xeroCustomer = (orgId: string) => and(eq(customers.orgId, orgId), sql`${customers.externalId} ~* ${XERO_ID_PATTERN}`);

// A Xero customer is removable only if every invoice they have is itself a Xero import (or they have none).
const removableCustomer = (orgId: string) => and(
  xeroCustomer(orgId),
  sql`NOT EXISTS (SELECT 1 FROM invoices i WHERE i.customer_id = ${customers.id} AND (i.external_id IS NULL OR i.external_id !~* ${XERO_ID_PATTERN}))`,
);

export async function previewXeroData(orgId: string): Promise<ImportedSummary> {
  const [inv] = await db.select({ n: sql<number>`count(*)::int` }).from(invoices).where(xeroInvoice(orgId));
  const [cus] = await db.select({ n: sql<number>`count(*)::int` }).from(customers).where(removableCustomer(orgId));
  const sample: Array<{ name: string }> = await db.select({ name: customers.name }).from(customers).where(removableCustomer(orgId)).limit(8);
  return { invoices: Number(inv?.n ?? 0), customers: Number(cus?.n ?? 0), sampleCustomers: sample.map((s) => s.name) };
}

/**
 * Remove what a Xero sync imported: its invoices (with their reminders and payments, which go with them),
 * then its customers, except any customer who still has an invoice that was not imported from Xero.
 */
export async function purgeXeroData(orgId: string): Promise<{ invoices: number; customers: number }> {
  const removedInvoices: Array<{ id: string }> = await db.delete(invoices).where(xeroInvoice(orgId)).returning({ id: invoices.id });
  const removedCustomers: Array<{ id: string }> = await db.delete(customers).where(and(
    xeroCustomer(orgId),
    sql`NOT EXISTS (SELECT 1 FROM invoices i WHERE i.customer_id = ${customers.id})`,
  )).returning({ id: customers.id });
  return { invoices: removedInvoices.length, customers: removedCustomers.length };
}
