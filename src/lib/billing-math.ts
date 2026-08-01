/**
 * Pure invoice-balance math shared by the Stripe webhook handlers in
 * billing.ts (payment application + refund reversal). Extracted so this
 * money-affecting logic can be unit tested without pulling in Stripe/DB
 * imports. DO NOT reintroduce DB/network calls here — keep it pure.
 */

export type InvoiceBalanceStatus = 'sent' | 'partial' | 'paid';

export interface InvoiceBalanceResult {
  newAmountPaid: number;
  status: InvoiceBalanceStatus;
}

/**
 * Half-cent tolerance for floating point rounding when comparing amountPaid
 * to the invoice total (Stripe amounts, string->number DB round-trips, etc).
 */
const PAID_IN_FULL_TOLERANCE = 0.005;

/**
 * Apply an incoming payment (full or partial) to an invoice's running balance.
 * Mirrors the logic in markInvoicePaidInDb: a payment can only move an invoice
 * to 'paid' or 'partial' — never back to 'sent' (that's refund territory).
 */
export function applyPayment(priorPaid: number, paymentAmount: number, totalDue: number): InvoiceBalanceResult {
  const newAmountPaid = priorPaid + paymentAmount;
  const isPaidInFull = newAmountPaid + PAID_IN_FULL_TOLERANCE >= totalDue;
  return { newAmountPaid, status: isPaidInFull ? 'paid' : 'partial' };
}

/**
 * Apply a refund (full or partial) to an invoice's running balance, rolling
 * the status back accordingly. Mirrors the logic in reversePaymentForInvoice.
 * amountPaid is clamped at 0 — a refund can never drive the balance negative.
 */
export function applyRefund(priorPaid: number, refundAmount: number, totalDue: number): InvoiceBalanceResult {
  const newAmountPaid = Math.max(0, priorPaid - refundAmount);
  const isPaidInFull = newAmountPaid + PAID_IN_FULL_TOLERANCE >= totalDue;
  const status: InvoiceBalanceStatus = isPaidInFull ? 'paid' : newAmountPaid > 0 ? 'partial' : 'sent';
  return { newAmountPaid, status };
}
