import type { Invoice } from '../db/schema.ts';
import { escapeHtml } from './utils.ts';

/**
 * `extraHtml` is already-escaped markup from multi-invoice.ts, placed under the message.
 * Everything else is text and is escaped here: the body is AI-written from names that come from
 * imported accounting data, and the business name and invoice number are imported too.
 */
export function renderEmailHtml({ body, invoice, businessName, extraHtml = '' }: { body: string; invoice: Invoice; businessName: string; extraHtml?: string }) {
  return `
    <!doctype html>
    <html><body style="font-family: -apple-system, system-ui, sans-serif; color: #16171c; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(body)}</p>${extraHtml}
      <hr style="border: 0; border-top: 1px solid #eeeef0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #6c6e76;">${escapeHtml(businessName)} · Invoice #${escapeHtml(String(invoice.number))} for ${escapeHtml(String(invoice.currency))} ${escapeHtml(String(invoice.amount))}</p>
    </body></html>
  `;
}
