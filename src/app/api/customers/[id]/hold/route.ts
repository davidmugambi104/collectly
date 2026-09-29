import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customers, dunningHolds, timelineEvents } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { recordEvent } from '@/lib/events';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningHoldSchema } from '@/lib/dunning-hold-schema';
import { cleanHoldReason, parseHoldUntil } from '@/lib/dunning/hold';

/**
 * Pause or resume AUTOMATIC reminders for one customer.
 *
 * This is the owner's switch and it is separate from customers.dnd_at, the
 * compliance switch that unsubscribes and hard bounces set. Nothing here reads
 * or writes dnd_at, so resuming can never re-enable a customer who opted out.
 * A manual send from the composer is still allowed while a hold is on.
 */

async function ownedCustomer(orgId: string, id: string) {
  const [row] = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.orgId, orgId)))
    .limit(1);
  return row ?? null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  await ensureDunningHoldSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const customer = await ownedCustomer(orgId, id);
  if (!customer) return NextResponse.json({ error: 'not found' }, { status: 404 });

  let body: unknown = {};
  try { body = await req.json(); } catch { /* an empty body means an open-ended hold */ }
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  const until = parseHoldUntil(input.heldUntil);
  if (!until.ok) return NextResponse.json({ error: until.error }, { status: 400 });
  const reason = cleanHoldReason(input.reason);
  const now = new Date();

  await db
    .insert(dunningHolds)
    .values({ customerId: customer.id, orgId, heldUntil: until.value, reason, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: dunningHolds.customerId,
      set: { heldUntil: until.value, reason, updatedAt: now },
    });

  const endText = until.value ? `until ${until.value.toISOString().slice(0, 10)}` : 'until you resume';
  await db.insert(timelineEvents).values({
    id: nanoid(),
    orgId,
    customerId: customer.id,
    actorId: userId ?? null,
    eventType: 'reminders_paused',
    title: `Automatic reminders paused ${endText}`,
    description: reason,
  });
  await recordEvent({
    orgId,
    type: 'dunning.hold.set',
    actorId: userId ?? undefined,
    payload: { customerId: customer.id, heldUntil: until.value?.toISOString() ?? null },
  });

  return NextResponse.json({ ok: true, heldUntil: until.value?.toISOString() ?? null, reason });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  await ensureDunningHoldSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const customer = await ownedCustomer(orgId, id);
  if (!customer) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const removed = await db
    .delete(dunningHolds)
    .where(and(eq(dunningHolds.customerId, customer.id), eq(dunningHolds.orgId, orgId)))
    .returning({ id: dunningHolds.customerId });

  if (removed.length > 0) {
    await db.insert(timelineEvents).values({
      id: nanoid(),
      orgId,
      customerId: customer.id,
      actorId: userId ?? null,
      eventType: 'reminders_resumed',
      title: 'Automatic reminders resumed',
    });
    await recordEvent({
      orgId,
      type: 'dunning.hold.cleared',
      actorId: userId ?? undefined,
      payload: { customerId: customer.id },
    });
  }
  return NextResponse.json({ ok: true });
}
