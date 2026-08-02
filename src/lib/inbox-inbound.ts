import { db } from '@/db';
import { invoices, customers, organizations, inboxMessages, timelineEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { classifyInboundReply } from '@/lib/ai/inbox';

const REPLY_TOKEN_RE = /reply\+([a-zA-Z0-9_-]+)@/;

/**
 * Extract the invoice id from a dunning reply-to address
 * (reply+{invoiceId}@domain, stamped by buildInboxReplyToAddress in
 * src/lib/infra.ts) out of the inbound webhook's "to" list. Returns null
 * if none of the recipients match — meaning this inbound email isn't an
 * AR-customer reply and should fall through to the outreach-prospect flow.
 */
export function parseInboxReplyToken(toAddresses: unknown): string | null {
  const list = Array.isArray(toAddresses) ? toAddresses : typeof toAddresses === 'string' ? [toAddresses] : [];
  for (const raw of list) {
    const m = String(raw).match(REPLY_TOKEN_RE);
    if (m) return m[1];
  }
  return null;
}

/**
 * Handle an inbound reply from an AR customer (someone who owes an
 * invoice) replying to a dunning email. Resolves the invoice -> customer
 * -> org, classifies the reply with AI, and records it as an
 * inbox_messages row plus a customer_reply timeline event so it shows up
 * on both the Inbox page and the customer detail page.
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
    aiSuggestedPromiseDate: classification.suggestedPromiseDate ? new Date(classification.suggestedPromiseDate) : null,
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
