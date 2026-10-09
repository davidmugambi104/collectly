/**
 * Rule for SMS steps when Twilio is not set up.
 *
 * Decision: an SMS step is SKIPPED, not queued and not sent. The scheduler
 * records a cancelled run carrying the reason (and a dunning.run.cancelled
 * event) so it shows on the invoice timeline. The sequence carries on: the next
 * step is picked up when its day arrives. There is NO reroute to email; a step
 * set to text never becomes an email. This holds in approval mode and in
 * auto-send mode, so no SMS draft can sit in the approval queue with nothing
 * able to send it.
 *
 * An invoice that is already past the text step when it is first looked at (a
 * new account's oldest invoices) drafts the latest earlier step instead, once,
 * so the most overdue invoices are not left with nothing.
 *
 * A skipped step is not retried if Twilio is configured later (same as a step
 * cancelled for missing contact info). Later steps are unaffected.
 */

type Env = Record<string, string | undefined>;

/** True only when all three Twilio settings are present. Same test sendSms() uses. */
export function isSmsConfigured(env: Env = process.env): boolean {
  return !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER);
}

export const SMS_UNCONFIGURED_REASON = 'sms not configured: Twilio is not set up, so this text step was skipped';

/** Why this step must be skipped before any draft is made, or null if it can go ahead. */
export function smsStepSkipReason(channel: 'email' | 'sms' | 'phone', smsConfigured: boolean): string | null {
  return channel === 'sms' && !smsConfigured ? SMS_UNCONFIGURED_REASON : null;
}

/** The latest step that is due, whatever order steps were saved in. */
export function latestDueStep<T extends { daysFromDue: number }>(steps: T[] | null | undefined, daysOverdue: number): T | null {
  const due = (steps ?? []).filter((s) => s.daysFromDue <= daysOverdue).sort((a, b) => a.daysFromDue - b.daysFromDue);
  return due.length ? due[due.length - 1] : null;
}

/** The latest due step that can actually go out: text steps are passed over when SMS is not set up. */
export function latestDraftableStep<T extends { daysFromDue: number; channel: 'email' | 'sms' | 'phone' }>(steps: T[] | null | undefined, daysOverdue: number, smsConfigured: boolean): T | null {
  return latestDueStep((steps ?? []).filter((s) => smsStepSkipReason(s.channel, smsConfigured) === null), daysOverdue);
}
