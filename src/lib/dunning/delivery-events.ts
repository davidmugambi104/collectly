/**
 * What a Resend delivery webhook means for a reminder and its recipient.
 *
 * Pure on purpose: the route verifies the signature and touches the database,
 * this decides what should happen, so the rules can be tested without either.
 *
 * Hard vs soft. Resend labels every bounce Permanent, Transient or
 * Undetermined. Only a Permanent bounce means the address cannot receive mail
 * (no such mailbox, no such domain), so only that one switches the customer off
 * (customers.dnd_at, the same compliance switch as an unsubscribe). A Transient
 * bounce (mailbox full, server busy) or an Undetermined one is recorded as a
 * failed run so the owner sees it, but the customer keeps getting reminders.
 * A spam complaint always switches the customer off.
 */
import { Webhook } from 'svix';

export type RunStatus = string;

export type DeliveryEvent = {
  type?: string;
  data?: { message_id?: string; bounce?: { message?: string; type?: string; subType?: string } };
};

export type DeliveryPlan = {
  /** New status for the run, or null to leave it alone. */
  setStatus: 'delivered' | 'opened' | 'clicked' | 'failed' | null;
  /** Error text to store on the run when it is marked failed. */
  error?: string;
  /** Switch the customer off (do not disturb). */
  suppressCustomer: boolean;
  /** Why, for logs and tests. */
  reason: 'hard_bounce' | 'soft_bounce' | 'complaint' | 'progress' | 'no_change' | 'ignored';
};

// A run can only move forward through these. Anything else (failed, cancelled)
// is final, so a late or retried event cannot bring a dead run back to life.
const RANK: Record<string, number> = { scheduled: 0, sent: 1, delivered: 2, opened: 3, clicked: 4 };
const PROGRESS: Record<string, 'delivered' | 'opened' | 'clicked'> = {
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
};

export function isHardBounce(bounce: { type?: string } | undefined): boolean {
  return String(bounce?.type ?? '').toLowerCase() === 'permanent';
}

export function planDeliveryEvent(runStatus: RunStatus, event: DeliveryEvent): DeliveryPlan {
  const type = String(event?.type ?? '');

  if (type === 'email.bounced') {
    const bounce = event?.data?.bounce;
    const hard = isHardBounce(bounce);
    const detail = (bounce?.message || '').slice(0, 300) || (hard ? 'address does not exist' : 'temporary delivery problem');
    return {
      setStatus: 'failed',
      error: `${hard ? 'bounced' : 'temporary bounce'}: ${detail}`,
      suppressCustomer: hard,
      reason: hard ? 'hard_bounce' : 'soft_bounce',
    };
  }

  if (type === 'email.complained') {
    return { setStatus: 'failed', error: 'recipient marked as spam', suppressCustomer: true, reason: 'complaint' };
  }

  const next = PROGRESS[type];
  if (next) {
    const cur = RANK[runStatus];
    if (cur === undefined) return { setStatus: null, suppressCustomer: false, reason: 'no_change' };
    if (RANK[next] > cur) return { setStatus: next, suppressCustomer: false, reason: 'progress' };
    return { setStatus: null, suppressCustomer: false, reason: 'no_change' };
  }

  return { setStatus: null, suppressCustomer: false, reason: 'ignored' };
}

/** Verify a Resend (svix) webhook. Returns the parsed event, or throws if the signature is bad or stale. */
export function verifyDeliveryWebhook(
  secret: string,
  rawBody: string,
  headers: { get(name: string): string | null },
): DeliveryEvent {
  const wh = new Webhook(secret);
  return wh.verify(rawBody, {
    'svix-id': headers.get('svix-id') || '',
    'svix-timestamp': headers.get('svix-timestamp') || '',
    'svix-signature': headers.get('svix-signature') || '',
  }) as DeliveryEvent;
}
