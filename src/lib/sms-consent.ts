/**
 * Double opt-in for SMS payment reminders.
 *
 * Required for Twilio toll-free verification, which asks for proof that each
 * recipient gave express written consent. The flow is:
 *
 *   1. sendConsentInvite()  -> status 'pending', logs invite_sent
 *   2. they reply YES       -> status 'opted_in', logs opted_in, sends a
 *                              confirmation naming the business and the
 *                              STOP/HELP instructions
 *   3. they reply STOP      -> status 'opted_out', logs opted_out
 *
 * Consent is deliberately separate from customers.dndAt. dndAt is a blanket
 * "stop all dunning" switch that can be set from the unsubscribe page; this is
 * SMS-specific and starts at 'none', because a phone number arriving from Xero
 * is not permission to text it.
 *
 * Message copy is fixed here rather than templated per org. Toll-free
 * verification reviews the exact wording, and the required elements -- business
 * name, what the messages are, "Msg & data rates may apply", and the STOP
 * instruction -- have to survive whatever an org would otherwise edit.
 */
import { db } from '@/db';
import { customers, smsConsentEvents, organizations } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sendSms } from '@/lib/infra';
import { BRAND } from '@/lib/seo';
import { classifyInboundSms, type SmsIntent } from '@/lib/sms-consent-keywords';
import { ensureSmsConsentSchema } from '@/lib/sms-consent-schema';

export { classifyInboundSms, type SmsIntent };

export function inviteMessage(businessName: string): string {
  return `${businessName} uses ${BRAND} to send payment reminders by text. Reply YES to opt in. Msg & data rates may apply. Reply STOP anytime.`;
}

export function confirmationMessage(businessName: string): string {
  return `You're opted in to receive payment reminder texts from ${businessName} via ${BRAND}. Msg & data rates may apply. Reply STOP to unsubscribe, HELP for help.`;
}

export function helpMessage(businessName: string): string {
  return `${BRAND} sends payment reminders for ${businessName}. Reply STOP to unsubscribe. Msg & data rates may apply.`;
}

async function logConsentEvent(row: {
  orgId?: string | null;
  customerId?: string | null;
  phone: string;
  eventType: 'invite_sent' | 'opted_in' | 'opted_out';
  messageText?: string | null;
  twilioSid?: string | null;
}): Promise<void> {
  await db.insert(smsConsentEvents).values({
    orgId: row.orgId ?? null,
    customerId: row.customerId ?? null,
    phone: row.phone,
    eventType: row.eventType,
    messageText: row.messageText ?? null,
    twilioSid: row.twilioSid ?? null,
  });
}

export interface ConsentInviteResult {
  ok: boolean;
  status?: 'pending';
  sid?: string;
  error?: string;
}

/**
 * Send the opt-in invite to a customer and mark them pending.
 *
 * Refuses to re-invite someone who has opted out. Re-inviting after a STOP is
 * exactly what the regime exists to prevent, and Twilio would block it at the
 * carrier level anyway -- but failing here means we never generate the attempt.
 */
export async function sendConsentInvite(customerId: string): Promise<ConsentInviteResult> {
  await ensureSmsConsentSchema();
  const [row] = await db
    .select({ customer: customers, org: organizations })
    .from(customers)
    .innerJoin(organizations, eq(organizations.id, customers.orgId))
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!row) return { ok: false, error: 'customer not found' };
  const { customer, org } = row;
  if (!customer.phone) return { ok: false, error: 'customer has no phone number' };
  if (customer.smsConsentStatus === 'opted_out') {
    return { ok: false, error: 'customer has opted out of SMS; re-inviting is not permitted' };
  }
  if (customer.smsConsentStatus === 'opted_in') {
    return { ok: false, error: 'customer is already opted in' };
  }

  const body = inviteMessage(org.name);
  const result = await sendSms({ to: customer.phone, body });
  if (result.status === 'skipped') {
    return { ok: false, error: 'Twilio is not configured' };
  }

  await db
    .update(customers)
    .set({ smsConsentStatus: 'pending', updatedAt: new Date() })
    .where(eq(customers.id, customerId));

  await logConsentEvent({
    orgId: customer.orgId,
    customerId: customer.id,
    phone: customer.phone,
    eventType: 'invite_sent',
    messageText: body,
    twilioSid: result.sid,
  });

  return { ok: true, status: 'pending', sid: result.sid };
}

export interface InboundResult {
  intent: SmsIntent;
  matched: boolean;
  reply?: string;
}

/**
 * Process an inbound SMS.
 *
 * An unmatched phone number is not an error for an opt-out: a STOP binds us
 * whether or not we can tie the number to a customer row, so it is logged
 * either way. For an opt-in we need the org name for the confirmation, so an
 * unmatched YES is recorded and otherwise ignored.
 */
export async function handleInboundSms(from: string, body: string): Promise<InboundResult> {
  const intent = classifyInboundSms(body);
  if (intent === 'unknown') return { intent, matched: false };
  await ensureSmsConsentSchema();

  const [row] = await db
    .select({ customer: customers, org: organizations })
    .from(customers)
    .innerJoin(organizations, eq(organizations.id, customers.orgId))
    .where(eq(customers.phone, from))
    .orderBy(desc(customers.updatedAt))
    .limit(1);

  if (intent === 'opt_out') {
    // Logged before the customer lookup matters -- see the note above.
    await logConsentEvent({
      orgId: row?.customer.orgId ?? null,
      customerId: row?.customer.id ?? null,
      phone: from,
      eventType: 'opted_out',
      messageText: body,
    });
    if (row) {
      await db
        .update(customers)
        .set({ smsConsentStatus: 'opted_out', smsConsentAt: new Date(), updatedAt: new Date() })
        .where(eq(customers.id, row.customer.id));
    }
    // No reply sent: Twilio's carrier-level STOP handling already sends the
    // confirmation, and sending our own would be a second message to someone
    // who just asked us to stop.
    return { intent, matched: !!row };
  }

  if (!row) return { intent, matched: false };

  if (intent === 'opt_in') {
    // Record BEFORE sending the confirmation. The log is the evidence that the
    // customer consented; the confirmation is a courtesy we extend afterwards.
    // Logging second lost the opted_in event whenever the confirmation failed
    // -- which is exactly what happened on a Twilio trial account, where
    // sendSms throws for any unverified number. The status flipped, the audit
    // did not, and the audit is the whole reason this feature exists.
    await db
      .update(customers)
      .set({ smsConsentStatus: 'opted_in', smsConsentAt: new Date(), updatedAt: new Date() })
      .where(eq(customers.id, row.customer.id));
    await logConsentEvent({
      orgId: row.customer.orgId,
      customerId: row.customer.id,
      phone: from,
      eventType: 'opted_in',
      messageText: body,
    });
    const reply = confirmationMessage(row.org.name);
    // A failed confirmation must not unwind a recorded consent.
    try {
      await sendSms({ to: from, body: reply });
    } catch (e: unknown) {
      console.error('[sms-consent] confirmation send failed:', e instanceof Error ? e.message : e);
    }
    return { intent, matched: true, reply };
  }

  // help
  const reply = helpMessage(row.org.name);
  try {
    await sendSms({ to: from, body: reply });
  } catch (e: unknown) {
    console.error('[sms-consent] help send failed:', e instanceof Error ? e.message : e);
  }
  return { intent, matched: true, reply };
}

/** Whether an SMS dunning step may be sent to this customer. */
export function maySendSms(customer: { smsConsentStatus: string | null; dndAt: Date | null }): boolean {
  return !customer.dndAt && customer.smsConsentStatus === 'opted_in';
}
