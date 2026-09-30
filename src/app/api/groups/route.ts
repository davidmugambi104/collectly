import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customerGroups, groupSequences, dunningSequences } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { recordEvent } from '@/lib/events';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { normalizeGroupName, copySteps, type StarterStep } from '@/lib/groups';
import { isDefaultSequence } from '@/lib/dunning/org-settings';

/**
 * POST { name } creates a customer group with its own reminder schedule, copied
 * from the organisation's schedule so it starts sensible. Customers in the group
 * follow this schedule instead of the default one.
 */
export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let input: Record<string, unknown> = {};
  try { const p = await req.json(); if (p && typeof p === 'object') input = p as Record<string, unknown>; } catch { /* handled below */ }
  const name = normalizeGroupName(input.name);
  if (!name) return NextResponse.json({ error: 'Give the group a name.' }, { status: 400 });

  const [dup] = await db.select({ id: customerGroups.id }).from(customerGroups).where(and(eq(customerGroups.orgId, orgId), eq(customerGroups.name, name))).limit(1);
  if (dup) return NextResponse.json({ error: `You already have a group called "${name}".` }, { status: 409 });

  const [base] = await db.select({ steps: dunningSequences.steps }).from(dunningSequences).where(and(eq(dunningSequences.orgId, orgId), isDefaultSequence)).limit(1);
  const groupId = nanoid();
  const sequenceId = nanoid();
  await db.transaction(async (tx: typeof db) => {
    await tx.insert(customerGroups).values({ id: groupId, orgId, name });
    await tx.insert(dunningSequences).values({ id: sequenceId, orgId, name: `Group: ${name}`, isActive: true, steps: copySteps(base?.steps as StarterStep[] | undefined) });
    await tx.insert(groupSequences).values({ groupId, sequenceId, orgId });
  });
  await recordEvent({ orgId, type: 'dunning.group.created', actorId: userId ?? undefined, payload: { groupId, name } });
  return NextResponse.json({ ok: true, id: groupId, sequenceId });
}
