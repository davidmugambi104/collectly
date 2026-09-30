export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { customerGroups, customerGroupMembers, groupSequences, dunningSequences } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { GroupsManager, type GroupRow } from '@/components/dunning/groups-manager';

export default async function GroupsPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  let rows: GroupRow[] = [];
  let failed = false;
  try {
    await ensureDunningControlSchema();
    const groups = await db.select().from(customerGroups).where(eq(customerGroups.orgId, orgId)).orderBy(customerGroups.name);
    const counts = await db.select({ groupId: customerGroupMembers.groupId, n: sql<number>`count(*)::int` }).from(customerGroupMembers).where(eq(customerGroupMembers.orgId, orgId)).groupBy(customerGroupMembers.groupId);
    const seqs = await db.select({ groupId: groupSequences.groupId, steps: dunningSequences.steps }).from(groupSequences).innerJoin(dunningSequences, eq(dunningSequences.id, groupSequences.sequenceId)).where(eq(groupSequences.orgId, orgId));
    rows = groups.map((g: typeof groups[number]) => ({
      id: g.id, name: g.name,
      members: counts.find((c: { groupId: string; n: number }) => c.groupId === g.id)?.n ?? 0,
      steps: (seqs.find((s: { groupId: string }) => s.groupId === g.id)?.steps as unknown[] | undefined)?.length ?? 0,
    }));
  } catch (e) {
    failed = true;
    console.error('[groups page] failed:', e instanceof Error ? e.message : e);
  }

  return (
    <AppShell title="Groups" subtitle="Give different customers their own reminder schedule.">
      {failed
        ? <div role="alert" className="alert-danger">Groups could not be loaded. Refresh, and contact support if this keeps happening.</div>
        : <GroupsManager groups={rows} />}
    </AppShell>
  );
}
