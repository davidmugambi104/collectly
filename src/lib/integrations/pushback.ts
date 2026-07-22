/**
 * Payment pushback — when a customer pays an invoice through Collectly,
 * we mirror that payment back into the connected accounting system so
 * the org's books stay reconciled without manual data entry.
 *
 * - QBO: POST a Payment object to QBO, allocating it to the Invoice by id.
 * - Xero: POST a Payment object, allocating it to the Invoice by id.
 * - No integration: skip silently (local payment is still recorded).
 *
 * All pushes are best-effort: failures are logged but do NOT roll back
 * the local payment. Next sync will reconcile any drift.
 */
import { db } from '@/db';
import { integrations, invoices, customers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { qboRecordPayment } from './quickbooks';
import { xeroRecordPayment } from './xero';

export async function pushPaymentToAccounting(opts: {
  orgId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  paymentRef: string;
}): Promise<{ pushed: boolean; provider?: string; reason?: string }> {
  // Load the local invoice + customer so we have their external ids
  const [row] = await db
    .select({ invoice: invoices, customer: customers })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(eq(invoices.id, opts.invoiceId))
    .limit(1);
  if (!row) return { pushed: false, reason: 'invoice not found' };
  if (!row.invoice.externalId) {
    return { pushed: false, reason: 'invoice has no external id (not synced from accounting)' };
  }
  if (!row.customer.externalId) {
    return { pushed: false, reason: 'customer has no external id (not synced from accounting)' };
  }

  // Find a connected accounting integration
  const [integ] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgId, opts.orgId), eq(integrations.status, 'connected')))
    .limit(1);
  if (!integ) return { pushed: false, reason: 'no accounting integration connected' };

  if (integ.provider === 'quickbooks') {
    await qboRecordPayment(opts.orgId, {
      qboInvoiceId: row.invoice.externalId,
      customerRef: { value: row.customer.externalId },
      amount: opts.amount,
      currency: opts.currency,
      paymentRef: opts.paymentRef,
    });
    return { pushed: true, provider: 'quickbooks' };
  }

  if (integ.provider === 'xero') {
    await xeroRecordPayment(opts.orgId, {
      xeroInvoiceId: row.invoice.externalId,
      xeroContactId: row.customer.externalId,
      amount: opts.amount,
      currency: opts.currency,
      reference: opts.paymentRef,
    });
    return { pushed: true, provider: 'xero' };
  }

  // Square / Plaid / Stripe do not act as the system of record for invoices
  return { pushed: false, reason: `provider ${integ.provider} does not support invoice write-back` };
}
