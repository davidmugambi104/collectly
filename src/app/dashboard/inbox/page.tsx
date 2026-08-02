export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { InboxList } from '@/components/inbox/inbox-list';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { inboxMessages, customers, invoices } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function InboxPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const rows = await db
    .select({
      message: inboxMessages,
      customerName: customers.name,
      invoiceNumber: invoices.number,
    })
    .from(inboxMessages)
    .leftJoin(customers, eq(customers.id, inboxMessages.customerId))
    .leftJoin(invoices, eq(invoices.id, inboxMessages.invoiceId))
    .where(eq(inboxMessages.orgId, orgId))
    .orderBy(desc(inboxMessages.receivedAt));

  const items = rows.map((r: typeof rows[number]) => ({
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
  }));

  const newCount = items.filter((i: typeof items[number]) => i.status === 'new').length;

  return (
    <AppShell
      title="Inbox"
      subtitle={`${items.length} customer repl${items.length === 1 ? 'y' : 'ies'}${newCount > 0 ? ` · ${newCount} new` : ''}`}
    >
      <p className="text-sm text-ink-600 mb-5">Every reply to a dunning email lands here, classified by AI with a recommended next step.</p>
      <InboxList items={items} />
    </AppShell>
  );
}
