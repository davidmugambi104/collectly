import { db } from '@/db';
import { invoices, customers, organizations, inboxMessages, timelineEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { classifyInboundReply } from '@/lib/ai/inbox';

// classifyInboundReply's Gemini call only validates suggestedPromiseDate as
// z.string().nullable() -- no date-format check -- and the model
// (gemini-flash-lite) has been observed to drift from the requested
// YYYY-MM-DD format (e.g. "ASAP", "next Friday"). `new Date(x).toISOString()`
// on an unparseable string throws RangeError, and that throw happened
// *inside* the db.insert(inboxMessages) call below -- meaning a customer
// reply with a bad date silently lost both the inbox message and the
// timeline event, with only a caught error one layer up in
// inbox-imap-poll.ts logging it. The IMAP UID cursor still advances past
// the message regardless, so it was never retried either. Parse
// defensively instead of trusting the model's string.
function parseValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

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
  rawPayload: unknown;
}): Promise<{ handled: boolean; inboxMessageId?: string; reason?: string }> {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, opts.invoiceId)).limit(1);
  if (!invoice) return { handled: false, reason: 'invoice not found' };

  const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId)).limit(1);
  const [org] = await db.select().from(organizations).where(eq(organizations.id, invoice.orgId)).limit(1);

  const classification = await classifyInboundReply({
    subject: opts.subject || null,
    body: opts.body,
    customerName: customer?.name ?? null,
    businessName: org?.name ?? 'the team',
    invoiceNumber: invoice.number,
    amountDue: (Number(invoice.amount) - Number(invoice.amountPaid ?? 0)).toFixed(2),
    currency: invoice.currency,
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : null,
  });

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
    rawPayload: opts.rawPayload as any,
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

  return { handled: true, inboxMessageId: inboxMessage.id };
}
