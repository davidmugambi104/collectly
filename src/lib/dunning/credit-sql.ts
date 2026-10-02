/**
 * The scheduler's credit rule as a SQL condition on a query that joins invoices
 * and customers: true when the customer's unapplied credit does NOT cover what they
 * owe in the invoice's currency. Same rule as creditCoversOwed() in credit.ts, which
 * the explainer uses; it lives here so the scheduler and its test run the same text.
 */
import { sql } from 'drizzle-orm';
import { customers, invoices, customerCredits } from '@/db/schema';

export const notCoveredByCredit = sql`NOT EXISTS (
  SELECT 1 FROM ${customerCredits} cc
  WHERE cc.customer_id = ${customers.id}
    AND cc.currency = ${invoices.currency}
    AND cc.amount > 0
    AND cc.amount >= (
      SELECT COALESCE(SUM(i2.amount - i2.amount_paid), 0) FROM invoices i2
      WHERE i2.customer_id = ${customers.id}
        AND i2.currency = ${invoices.currency}
        AND i2.status IN ('sent', 'viewed', 'overdue', 'partial')
    )
)`;
