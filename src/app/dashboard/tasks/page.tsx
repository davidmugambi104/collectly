export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { listOrgMembers } from '@/lib/org-members';
import { parseTaskView, type OrgMember } from '@/lib/dunning/task-assignment';
import { AppShell } from '@/components/app/shell';
import { TasksList, type TaskItem } from '@/components/dunning/tasks-list';
import { getAuth as auth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customers, dunningRuns, invoices, taskAssignments, taskOutcomes } from '@/db/schema';
import { CALL_OUTCOME_LABELS, type CallOutcome } from '@/lib/dunning/call-outcome';
import { formatDate, daysOverdue } from '@/lib/utils';

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ show?: string; who?: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');
  const { show, who } = await searchParams;
  const open = show !== 'done';
  const view = parseTaskView(who);
  await ensureDunningControlSchema();
  let members: OrgMember[] = [];
  let membersError = false;
  try { members = await listOrgMembers(orgId, userId); } catch { membersError = true; }

  const rows = await db
    .select({ run: dunningRuns, customerId: customers.id, customerName: customers.name, outcome: taskOutcomes.outcome, outcomeNote: taskOutcomes.note, assigneeId: taskAssignments.assigneeId, assigneeName: taskAssignments.assigneeName, phone: customers.phone, invoiceId: invoices.id, invoiceNumber: invoices.number, dueDate: invoices.dueDate })
    .from(dunningRuns)
    .innerJoin(invoices, eq(invoices.id, dunningRuns.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .leftJoin(taskAssignments, eq(taskAssignments.runId, dunningRuns.id))
    .leftJoin(taskOutcomes, eq(taskOutcomes.runId, dunningRuns.id))
    .where(and(eq(dunningRuns.orgId, orgId), eq(dunningRuns.channel, 'phone'), inArray(dunningRuns.status, open ? ['scheduled'] : ['sent', 'cancelled']), ...(view === 'me' ? [eq(taskAssignments.assigneeId, userId)] : view === 'unassigned' ? [isNull(taskAssignments.assigneeId)] : [])))
    .orderBy(desc(dunningRuns.createdAt))
    .limit(open ? 200 : 50);

  const items: TaskItem[] = rows.map((r: (typeof rows)[number]) => {
    const late = daysOverdue(r.dueDate);
    return {
      id: r.run.id, title: r.run.subject, note: r.run.body, status: r.run.status,
      assigneeId: r.assigneeId, assigneeName: r.assigneeName,
      outcomeLabel: r.outcome ? CALL_OUTCOME_LABELS[r.outcome as CallOutcome] ?? null : null, outcomeNote: r.outcomeNote ?? null,
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
        <span aria-hidden="true" className="mx-1 h-4 w-px bg-ink-300/70" />
        {([['all', 'Everyone'], ['me', 'Assigned to me'], ['unassigned', 'Unassigned']] as const).map(([v, label]) => (
          <Link key={v} href={`/dashboard/tasks?${new URLSearchParams({ ...(open ? {} : { show: 'done' }), ...(v === 'all' ? {} : { who: v }) })}`} aria-current={view === v ? 'page' : undefined} className={`badge ${view === v ? 'ring-1 ring-brand-500' : ''}`}>{label}</Link>
        ))}
      </div>
      <p className="mb-4 app-meta font-normal">Add a &quot;Call&quot; step to your <Link href="/dashboard/dunning" className="link-quiet">schedule</Link> and a task appears here when it is due. Nothing is sent to the customer.</p>
      {items.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-ink-300/70 px-4 py-8 text-center app-meta">{view === 'me' ? (open ? 'Nothing is assigned to you.' : 'You have not closed any assigned calls.') : view === 'unassigned' ? 'Every call has someone on it.' : open ? 'No calls to make right now.' : 'Nothing closed yet.'}</p>
      ) : <TasksList items={items} open={open} members={members} membersError={membersError} viewerId={userId} />}
    </AppShell>
  );
}
