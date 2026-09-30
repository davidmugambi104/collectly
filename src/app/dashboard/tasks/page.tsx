export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { AppShell } from '@/components/app/shell';
import { TasksList, type TaskItem } from '@/components/dunning/tasks-list';
import { getAuth as auth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customers, dunningRuns, invoices } from '@/db/schema';
import { formatDate, daysOverdue } from '@/lib/utils';

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');
  const { show } = await searchParams;
  const open = show !== 'done';

  const rows = await db
    .select({ run: dunningRuns, customerId: customers.id, customerName: customers.name, phone: customers.phone, invoiceId: invoices.id, invoiceNumber: invoices.number, dueDate: invoices.dueDate })
    .from(dunningRuns)
    .innerJoin(invoices, eq(invoices.id, dunningRuns.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(eq(dunningRuns.orgId, orgId), eq(dunningRuns.channel, 'phone'), inArray(dunningRuns.status, open ? ['scheduled'] : ['sent', 'cancelled'])))
    .orderBy(desc(dunningRuns.createdAt))
    .limit(open ? 200 : 50);

  const items: TaskItem[] = rows.map((r: (typeof rows)[number]) => {
    const late = daysOverdue(r.dueDate);
    return {
      id: r.run.id, title: r.run.subject, note: r.run.body, status: r.run.status,
      customerId: r.customerId, customerName: r.customerName, phone: r.phone,
      invoiceId: r.invoiceId, invoiceNumber: r.invoiceNumber,
      dueLabel: late > 0 ? `${late}d overdue` : `due ${formatDate(r.dueDate)}`,
      createdLabel: formatDate(r.run.createdAt),
    };
  });

  return (
    <AppShell title="Tasks" subtitle={open ? `${items.length} call${items.length === 1 ? '' : 's'} to make` : 'Calls you have closed'}>
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Show">
        <Link href="/dashboard/tasks" aria-current={open ? 'page' : undefined} className={`badge ${open ? 'ring-1 ring-brand-500' : ''}`}>To do</Link>
        <Link href="/dashboard/tasks?show=done" aria-current={!open ? 'page' : undefined} className={`badge ${!open ? 'ring-1 ring-brand-500' : ''}`}>Closed</Link>
        <span className="app-meta font-normal">Add a &quot;Call&quot; step to your <Link href="/dashboard/dunning" className="link-quiet">schedule</Link> and a task appears here when it is due. Nothing is sent to the customer.</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-ink-300/70 px-4 py-8 text-center app-meta">{open ? 'No calls to make right now.' : 'Nothing closed yet.'}</p>
      ) : <TasksList items={items} open={open} />}
    </AppShell>
  );
}
