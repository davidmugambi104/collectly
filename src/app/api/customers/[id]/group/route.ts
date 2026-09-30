import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customers, customerGroups, customerGroupMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { recordEvent } from '@/lib/events';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';

/** PUT { groupId: string | null } moves a customer into a group, or back to the default schedule. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const [cust] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, id), eq(customers.orgId, orgId))).limit(1);
  if (!cust) return NextResponse.json({ error: 'not found' }, { status: 404 });

  let input: Record<string, unknown> = {};
  try { const p = await req.json(); if (p && typeof p === 'object') input = p as Record<string, unknown>; } catch { /* handled below */ }
  const groupId = input.groupId;

  if (groupId === null || groupId === '') {
    await db.delete(customerGroupMembers).where(and(eq(customerGroupMembers.customerId, id), eq(customerGroupMembers.orgId, orgId)));
  } else if (typeof groupId === 'string') {
    const [g] = await db.select({ id: customerGroups.id }).from(customerGroups).where(and(eq(customerGroups.id, groupId), eq(customerGroups.orgId, orgId))).limit(1);
    if (!g) return NextResponse.json({ error: 'That group does not exist.' }, { status: 404 });
    await db.insert(customerGroupMembers).values({ customerId: id, groupId, orgId })
      .onConflictDoUpdate({ target: customerGroupMembers.customerId, set: { groupId } });
  } else {
    return NextResponse.json({ error: 'groupId must be a group id or null' }, { status: 400 });
  }
  await recordEvent({ orgId, type: 'dunning.group.member_set', actorId: userId ?? undefined, payload: { customerId: id, groupId: groupId || null } });
  return NextResponse.json({ ok: true });
}
