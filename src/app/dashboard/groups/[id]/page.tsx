export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { customerGroups, customerGroupMembers, groupSequences, dunningSequences, customers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { loadSenderContext } from '@/lib/dunning/org-settings';
import { SequenceEditor, type Step } from '@/components/dunning/sequence-editor';

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');
  const { id } = await params;

  await ensureDunningControlSchema();
  const [group] = await db.select().from(customerGroups).where(and(eq(customerGroups.id, id), eq(customerGroups.orgId, orgId))).limit(1);
  if (!group) notFound();

  const [seq] = await db.select({ id: dunningSequences.id, steps: dunningSequences.steps }).from(groupSequences).innerJoin(dunningSequences, eq(dunningSequences.id, groupSequences.sequenceId)).where(eq(groupSequences.groupId, id)).limit(1);
  const members = await db.select({ id: customers.id, name: customers.name }).from(customerGroupMembers).innerJoin(customers, eq(customers.id, customerGroupMembers.customerId)).where(and(eq(customerGroupMembers.groupId, id), eq(customerGroupMembers.orgId, orgId))).orderBy(customers.name);

  return (
    <AppShell title={group.name} subtitle="This group's reminder schedule. Its customers follow it instead of the default one.">
      <p className="mb-4 text-sm"><Link href="/dashboard/groups" className="link">All groups</Link></p>
      <section className="mb-6" aria-labelledby="members-heading">
        <h2 id="members-heading" className="app-heading">Customers in this group</h2>
        {members.length === 0
          ? <p className="app-meta mt-1 font-normal">None yet. Open a customer and choose this group under &quot;Reminder group&quot;.</p>
          : <ul className="mt-2 flex flex-wrap gap-2">{members.map((m: { id: string; name: string }) => <li key={m.id}><Link href={`/dashboard/customers/${m.id}`} className="badge">{m.name}</Link></li>)}</ul>}
      </section>
      {seq
        ? <SequenceEditor initialSteps={seq.steps as Step[]} sequenceId={seq.id} sender={await loadSenderContext(orgId)} />
        : <div role="alert" className="alert-danger">This group has no schedule. Delete it and create it again.</div>}
    </AppShell>
  );
}
