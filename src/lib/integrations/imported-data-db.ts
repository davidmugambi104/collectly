/** The database side of imported-data.ts: preview what a Xero or QuickBooks sync left, and remove it. Always scoped to one organization. */
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { customers, invoices } from '@/db/schema';
import { PROVIDER_ID_PATTERN, type ImportProvider, type ImportedSummary } from '@/lib/integrations/imported-data';

const importedInvoice = (orgId: string, provider: ImportProvider) => and(eq(invoices.orgId, orgId), sql`${invoices.externalId} ~* ${PROVIDER_ID_PATTERN[provider]}`);
const importedCustomer = (orgId: string, provider: ImportProvider) => and(eq(customers.orgId, orgId), sql`${customers.externalId} ~* ${PROVIDER_ID_PATTERN[provider]}`);

// An imported customer is removable only if every invoice they have is itself an import from the same provider (or they have none).
const removableCustomer = (orgId: string, provider: ImportProvider) => and(
  importedCustomer(orgId, provider),
  sql`NOT EXISTS (SELECT 1 FROM invoices i WHERE i.customer_id = ${customers.id} AND (i.external_id IS NULL OR i.external_id !~* ${PROVIDER_ID_PATTERN[provider]}))`,
);

export async function previewImportedData(orgId: string, provider: ImportProvider): Promise<ImportedSummary> {
  const [inv] = await db.select({ n: sql<number>`count(*)::int` }).from(invoices).where(importedInvoice(orgId, provider));
  const [cus] = await db.select({ n: sql<number>`count(*)::int` }).from(customers).where(removableCustomer(orgId, provider));
  const sample: Array<{ name: string }> = await db.select({ name: customers.name }).from(customers).where(removableCustomer(orgId, provider)).limit(8);
  return { invoices: Number(inv?.n ?? 0), customers: Number(cus?.n ?? 0), sampleCustomers: sample.map((s) => s.name) };
}

/**
 * Remove what a sync imported: its invoices (with their reminders and payments, which go with them),
 * then its customers, except any customer who still has an invoice that was not imported from that provider.
 * One transaction, so a failure part-way leaves nothing half removed.
 */
export async function purgeImportedData(orgId: string, provider: ImportProvider): Promise<{ invoices: number; customers: number }> {
  return db.transaction(async (tx: typeof db) => {
    const removedInvoices: Array<{ id: string }> = await tx.delete(invoices).where(importedInvoice(orgId, provider)).returning({ id: invoices.id });
    const removedCustomers: Array<{ id: string }> = await tx.delete(customers).where(and(
      importedCustomer(orgId, provider),
      sql`NOT EXISTS (SELECT 1 FROM invoices i WHERE i.customer_id = ${customers.id})`,
    )).returning({ id: customers.id });
    return { invoices: removedInvoices.length, customers: removedCustomers.length };
  });
}

export const previewXeroData = (orgId: string) => previewImportedData(orgId, 'xero');
export const purgeXeroData = (orgId: string) => purgeImportedData(orgId, 'xero');
