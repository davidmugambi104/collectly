/**
 * Approval before send: the rules, kept pure so they're testable without a
 * database. The DB-bound half lives in deliver.ts.
 */

/** A missing settings row means approval is required. Safe by default. */
export function isApprovalRequired(row: { approvalRequired: boolean } | null | undefined): boolean {
  return row ? row.approvalRequired : true;
}

const CLOSED_INVOICE_STATUSES = new Set(['paid', 'written_off', 'disputed', 'void', 'draft']);

/**
 * Re-checked at the moment the owner clicks approve, because a draft can sit in
 * the queue for days. Returns why the reminder must not go out, or null.
 * Compliance checks (unsubscribe, SMS consent) are never overridable by
 * approval: a person approving a message is not the recipient's consent.
 */
export function approvalBlocker(opts: {
  invoiceStatus: string;
  customerDndAt: Date | string | null;
  channel: 'email' | 'sms';
  customerEmail: string | null;
  customerPhone: string | null;
  smsAllowed: boolean;
}): string | null {
  if (CLOSED_INVOICE_STATUSES.has(opts.invoiceStatus)) {
    return `invoice is ${opts.invoiceStatus.replace('_', ' ')} now, so there is nothing to chase`;
  }
  if (opts.customerDndAt) return 'customer has unsubscribed from reminders';
  if (opts.channel === 'email' && !opts.customerEmail) return 'customer has no email on file';
  if (opts.channel === 'sms') {
    if (!opts.customerPhone) return 'customer has no phone number on file';
    if (!opts.smsAllowed) return 'customer has not opted in to SMS';
  }
  return null;
}

export type ApprovalEdits = { subject?: string | null; body?: string | null };

/** Owner edits made in the queue. Blank body means "keep the draft". */
export function applyEdits(
  draft: { subject: string | null; body: string },
  edits: ApprovalEdits | undefined,
): { subject: string | null; body: string } {
  const body = typeof edits?.body === 'string' && edits.body.trim() ? edits.body.trim().slice(0, 5000) : draft.body;
  const subject = typeof edits?.subject === 'string' && edits.subject.trim()
    ? edits.subject.replace(/[\r\n]+/g, ' ').trim().slice(0, 200)
    : draft.subject;
  return { subject, body };
}
