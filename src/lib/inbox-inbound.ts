import { db } from '@/db';
import { invoices, customers, organizations, inboxMessages, timelineEvents } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { classifyInboundReply } from '@/lib/ai/inbox';
import { recordUsage } from '@/lib/usage-meter';
import { autoReplyClassification, detectUnsubscribeRequest, unsubscribeClassification, parseValidDate } from '@/lib/ai/inbox-rules';
import { ensureReplyClassificationSchema } from '@/lib/inbox-schema';

/**
 * Handle an inbound reply from an AR customer (someone who owes an
 * invoice) replying to a dunning email. Resolves the invoice -> customer
 * -> org, classifies the reply with AI, and records it as an
 * inbox_messages row plus a customer_reply timeline event so it shows up
 * on both the Inbox page and the customer detail page.
 *
 * Called by src/lib/inbox-imap-poll.ts once it's matched an inbound
 * message's In-Reply-To/References header to a dunning_runs row and
 * resolved the invoiceId from there.
 */
export async function handleArCustomerReply(opts: {
  invoiceId: string;
  fromAddress: string;
  fromName: string | null;
  subject: string;
  body: string;
  /** Out-of-office, bounce or other machine mail: recorded as no_action without asking the AI. */
  autoReply?: boolean;
  rawPayload: unknown;
}): Promise<{ handled: boolean; inboxMessageId?: string; reason?: string }> {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, opts.invoiceId)).limit(1);
  if (!invoice) return { handled: false, reason: 'invoice not found' };

  const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId)).limit(1);
  const [org] = await db.select().from(organizations).where(eq(organizations.id, invoice.orgId)).limit(1);

  // An opt-out is matched by rules first, so it never waits on (or is lost to) the AI call.
  const optedOut = !opts.autoReply && detectUnsubscribeRequest(opts.body);

  const rawClassification = opts.autoReply ? autoReplyClassification(opts.body) : optedOut ? unsubscribeClassification() : await classifyInboundReply({
    subject: opts.subject || null,
    body: opts.body,
    customerName: customer?.name ?? null,
    businessName: org?.name ?? 'the team',
    invoiceNumber: invoice.number,
    amountDue: (Number(invoice.amount) - Number(invoice.amountPaid ?? 0)).toFixed(2),
    currency: invoice.currency,
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : null,
  });

  if (!opts.autoReply && !optedOut) await recordUsage({ orgId: invoice.orgId, kind: 'ai_reply_classify' });

  // The model can also say 'unsubscribe' (e.g. "please don't write again").
  const unsubscribe = rawClassification.classification === 'unsubscribe';
  let classification = rawClassification;
  if (unsubscribe) {
    try {
      await ensureReplyClassificationSchema();
    } catch (e) {
      // Never lose the opt-out because the enum could not be widened: file it as unclassified.
      console.error('[inbox] could not add unsubscribe to reply_classification:', e instanceof Error ? e.message : e);
      classification = { ...rawClassification, classification: 'unclassified' };
    }
    // Same switch as the unsubscribe link and a hard bounce. Keep the first timestamp.
    const now = new Date();
    await db.update(customers).set({ dndAt: now, updatedAt: now })
      .where(and(eq(customers.id, invoice.customerId), isNull(customers.dndAt)));
  }

  const [inboxMessage] = await db.insert(inboxMessages).values({
    id: nanoid(),
    orgId: invoice.orgId,
    customerId: invoice.customerId,
    invoiceId: invoice.id,
    channel: 'email',
    fromAddress: opts.fromAddress,
    fromName: opts.fromName,
    subject: opts.subject || null,
    body: opts.body,
    rawPayload: opts.rawPayload,
    classification: classification.classification,
    classificationConfidence: classification.confidence.toFixed(3),
    aiSummary: classification.summary,
    aiRecommendedAction: classification.recommendedAction,
    aiSuggestedPromiseDate: parseValidDate(classification.suggestedPromiseDate),
    status: 'new',
  }).returning();

  await db.insert(timelineEvents).values({
    id: nanoid(),
    orgId: invoice.orgId,
    customerId: invoice.customerId,
    invoiceId: invoice.id,
    eventType: 'customer_reply',
    title: `Customer replied — ${classification.classification.replace(/_/g, ' ')}`,
    description: classification.summary,
  });

  if (unsubscribe) {
    await db.insert(timelineEvents).values({
      id: nanoid(),
      orgId: invoice.orgId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      eventType: 'unsubscribed',
      title: 'Customer asked to stop reminders — marked do not disturb',
      description: opts.body.replace(/\s+/g, ' ').trim().slice(0, 200),
    });
  }

  return { handled: true, inboxMessageId: inboxMessage.id };
}
