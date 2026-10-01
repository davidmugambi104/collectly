import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { dunningSettings, invoices } from '@/db/schema';
import { buildStatement, type Statement } from '@/lib/statements';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { loadOwedFees } from '@/lib/late-fees-load';

/** The customer's statement as of now, from their invoices in this organisation. */
export async function loadStatement(orgId: string, customerId: string, asOf: Date = new Date()): Promise<Statement> {
  await ensureDunningControlSchema(); // the late fee ledger creates itself
  const rows = await db
    .select({ number: invoices.number, currency: invoices.currency, status: invoices.status, issueDate: invoices.issueDate, dueDate: invoices.dueDate, amount: invoices.amount, amountPaid: invoices.amountPaid })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), eq(invoices.customerId, customerId)))
    .limit(2000);
  const fees = await loadOwedFees(orgId, customerId);
  return buildStatement(rows, asOf, fees.map((f) => ({ invoiceNumber: f.invoiceNumber, amountCents: f.amountCents, currency: f.currency, period: f.period })));
}

/** The org's payment details for the bottom of a statement, or null. */
export async function loadStatementFooter(orgId: string): Promise<string | null> {
  await ensureDunningControlSchema();
  const [row] = await db.select({ f: dunningSettings.statementFooter }).from(dunningSettings).where(eq(dunningSettings.orgId, orgId)).limit(1);
  return row?.f ?? null;
}
