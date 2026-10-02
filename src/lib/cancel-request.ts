/**
 * "Cancel or change plan" requests from the Billing page.
 *
 * Billing is manual while card checkout is off, so a request is recorded in
 * upgrade_requests (status 'pending', so it shows in the founder's admin list
 * with the other requests) and the founder is emailed. The kind is carried in
 * the notes prefix because the table has no column for it and the schema is not
 * changed for this. Pure helpers only: no database import, so they can be
 * unit-tested directly.
 */
import { escapeHtml } from './lead-email.ts';

export type CancelKind = 'cancel' | 'change';

export const CANCEL_NOTE_PREFIX: Record<CancelKind, string> = {
  cancel: '[CANCEL REQUEST]',
  change: '[PLAN CHANGE REQUEST]',
};

export function parseCancelKind(v: unknown): CancelKind | null {
  return v === 'cancel' || v === 'change' ? v : null;
}

/** Notes as stored: the kind prefix, then whatever the customer wrote (capped). */
export function buildCancelNotes(kind: CancelKind, text: string | null | undefined): string {
  const body = (text ?? '').trim().slice(0, 1500);
  return body ? `${CANCEL_NOTE_PREFIX[kind]} ${body}` : CANCEL_NOTE_PREFIX[kind];
}

export function isCancelNote(notes: string | null | undefined): boolean {
  return !!notes && notes.startsWith(CANCEL_NOTE_PREFIX.cancel);
}

export function founderEmail(opts: { kind: CancelKind; orgName: string; orgSlug: string; planName: string; ownerEmail: string | null; notes: string | null; requestId: string; appUrl: string }) {
  const what = opts.kind === 'cancel' ? 'Cancel request' : 'Plan change request';
  return {
    subject: `[${what}] ${opts.orgName} (${opts.planName})`,
    html: [
      `<p><strong>${what}.</strong> Confirm by email, then handle it in the admin list.</p>`,
      `<table style="border-collapse:collapse">`,
      `<tr><td style="padding:4px 12px 4px 0"><strong>Org</strong></td><td>${escapeHtml(opts.orgName)} (${escapeHtml(opts.orgSlug)})</td></tr>`,
      `<tr><td style="padding:4px 12px 4px 0"><strong>Current plan</strong></td><td>${escapeHtml(opts.planName)}</td></tr>`,
      `<tr><td style="padding:4px 12px 4px 0"><strong>Owner email</strong></td><td>${escapeHtml(opts.ownerEmail ?? 'unknown')}</td></tr>`,
      `</table>`,
      `<p><strong>Their note:</strong><br/>${escapeHtml(opts.notes ?? '(none)').replace(/\n/g, '<br/>')}</p>`,
      `<p style="color:#666;font-size:12px">Request ID: ${escapeHtml(opts.requestId)}. Review at <a href="${escapeHtml(opts.appUrl)}/admin/upgrade-requests">/admin/upgrade-requests</a></p>`,
    ].join('\n'),
  };
}

/** The customer's confirmation. States only what is true: nothing happens until David confirms. */
export function customerEmail(opts: { kind: CancelKind; orgName: string; firstName: string | null }) {
  const verb = opts.kind === 'cancel' ? 'cancel your plan' : 'change your plan';
  return {
    subject: `We got your request to ${verb} for ${opts.orgName}`,
    html: [
      `<p>Hi ${escapeHtml(opts.firstName ?? 'there')},</p>`,
      `<p>I received your request to ${verb} for <strong>${escapeHtml(opts.orgName)}</strong>. I will confirm by email, and nothing changes until I do.</p>`,
      opts.kind === 'cancel'
        ? `<p>Once the cancellation takes effect you are not charged again. Your data stays in your account until you delete it in Settings, and you can download your reminder history and aged receivables report as CSV from the app first.</p>`
        : `<p>I will confirm the new plan and price before anything is invoiced.</p>`,
      `<p>David<br/>Founder, Mugavi</p>`,
    ].join('\n'),
  };
}
