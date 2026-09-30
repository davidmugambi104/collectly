export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { InboxList } from '@/components/inbox/inbox-list';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { inboxMessages, inboxReplies, customers, invoices } from '@/db/schema';
import { eq, desc, asc, inArray } from 'drizzle-orm';
import { replyTarget } from '@/lib/inbox-reply';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';

export default async function InboxPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const rows = await db
    .select({
      message: inboxMessages,
      customerName: customers.name,
      customerEmail: customers.email,
      customerDndAt: customers.dndAt,
      invoiceNumber: invoices.number,
    })
    .from(inboxMessages)
    .leftJoin(customers, eq(customers.id, inboxMessages.customerId))
    .leftJoin(invoices, eq(invoices.id, inboxMessages.invoiceId))
    .where(eq(inboxMessages.orgId, orgId))
    .orderBy(desc(inboxMessages.receivedAt));

  // What the organisation has already written back. If the table cannot be read
  // the Inbox still opens, just without the earlier replies.
  const repliesBy = new Map<string, Array<{ id: string; sentAt: Date; body: string }>>();
  try {
    await ensureDunningControlSchema();
    const ids = rows.map((r: typeof rows[number]) => r.message.id);
    if (ids.length > 0) {
      const sent = await db.select({ id: inboxReplies.id, messageId: inboxReplies.messageId, sentAt: inboxReplies.sentAt, body: inboxReplies.body })
        .from(inboxReplies).where(inArray(inboxReplies.messageId, ids)).orderBy(asc(inboxReplies.sentAt));
      for (const r of sent as Array<{ id: string; messageId: string; sentAt: Date; body: string }>) {
        const list = repliesBy.get(r.messageId) ?? [];
        list.push({ id: r.id, sentAt: r.sentAt, body: r.body });
        repliesBy.set(r.messageId, list);
      }
    }
  } catch (e) {
    console.error('[inbox] replies failed to load:', e instanceof Error ? e.message : e);
  }

  const items = rows.map((r: typeof rows[number]) => {
    const target = r.message.channel === 'email'
      ? replyTarget({ fromAddress: r.message.fromAddress, customerEmail: r.customerEmail, unsubscribedAt: r.customerDndAt })
      : { ok: false as const, reason: 'Only email replies can be answered from here.' };
    return {
    id: r.message.id,
    fromAddress: r.message.fromAddress,
    fromName: r.message.fromName,
    subject: r.message.subject,
    body: r.message.body,
    classification: r.message.classification,
    aiSummary: r.message.aiSummary,
    aiRecommendedAction: r.message.aiRecommendedAction,
    aiSuggestedPromiseDate: r.message.aiSuggestedPromiseDate,
    status: r.message.status,
    receivedAt: r.message.receivedAt,
    customerId: r.message.customerId,
    customerName: r.customerName,
    invoiceNumber: r.invoiceNumber,
    replyTo: target.ok ? target.to : null,
    replyBlocked: target.ok ? null : target.reason,
    replies: repliesBy.get(r.message.id) ?? [],
    };
  });

  const newCount = items.filter((i: typeof items[number]) => i.status === 'new').length;
  // Reply capture is a real, built feature (src/lib/inbox-imap-poll.ts) that's
  // deliberately dormant until a dedicated mailbox exists — see the comment
  // on getDunningReplyToAddress() in src/lib/infra.ts for why it can't share
  // the cold-outreach mailbox. Surfaced honestly here instead of leaving the
  // page's normal empty state ("will show up here automatically") implying
  // a working feature that structurally cannot receive anything yet.
  const configured = !!process.env.AR_DUNNING_IMAP_USER;

  return (
    <AppShell
      title="Inbox"
      subtitle={`${items.length} customer repl${items.length === 1 ? 'y' : 'ies'}${newCount > 0 ? ` · ${newCount} new` : ''}`}
    >
      <p className="app-body mb-4 max-w-2xl text-ink-500">Every reply to a dunning email lands here, classified by AI with a recommended next step.</p>
      <InboxList items={items} configured={configured} emailConfigured={!!process.env.RESEND_API_KEY} />
    </AppShell>
  );
}