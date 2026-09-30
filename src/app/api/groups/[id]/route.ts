import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customerGroups, groupSequences, dunningSequences } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { recordEvent } from '@/lib/events';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';

/** DELETE removes the group and its schedule. Its customers go back to the default schedule. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const [group] = await db.select().from(customerGroups).where(and(eq(customerGroups.id, id), eq(customerGroups.orgId, orgId))).limit(1);
  if (!group) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const [link] = await db.select({ sequenceId: groupSequences.sequenceId }).from(groupSequences).where(eq(groupSequences.groupId, id)).limit(1);
  await db.transaction(async (tx: typeof db) => {
    // Deleting the sequence cascades to the link; deleting the group cascades to its members.
    if (link) await tx.delete(dunningSequences).where(and(eq(dunningSequences.id, link.sequenceId), eq(dunningSequences.orgId, orgId)));
    await tx.delete(customerGroups).where(and(eq(customerGroups.id, id), eq(customerGroups.orgId, orgId)));
  });
  await recordEvent({ orgId, type: 'dunning.group.deleted', actorId: userId ?? undefined, payload: { groupId: id, name: group.name } });
  return NextResponse.json({ ok: true });
}
