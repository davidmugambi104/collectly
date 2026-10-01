import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { dunningRuns, invoices, taskAssignments, taskOutcomes, timelineEvents } from '@/db/schema';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { recordEvent } from '@/lib/events';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { listOrgMembers } from '@/lib/org-members';
import { findMember } from '@/lib/dunning/task-assignment';
import { callTimelineTitle, hasOutcome, parseCallOutcome } from '@/lib/dunning/call-outcome';

/**
 * PATCH closes or assigns a call task. Only an open task in the caller's own org.
 *   { action: 'done' | 'skip' }
 *   { action: 'assign', assigneeId: string | null }   null clears the assignment
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  let body: { action?: unknown; assigneeId?: unknown; outcome?: unknown; note?: unknown } = {};
  try { body = (await req.json()) ?? {}; } catch { /* handled below */ }
  const action = body.action;

  if (action === 'assign') {
    await ensureDunningControlSchema();
    const [task] = await db.select({ id: dunningRuns.id }).from(dunningRuns)
      .where(and(eq(dunningRuns.id, id), eq(dunningRuns.orgId, orgId), eq(dunningRuns.channel, 'phone'), eq(dunningRuns.status, 'scheduled'))).limit(1);
    if (!task) return NextResponse.json({ error: 'That task is already closed, or does not exist.' }, { status: 409 });
    if (body.assigneeId === null) {
      await db.delete(taskAssignments).where(and(eq(taskAssignments.runId, id), eq(taskAssignments.orgId, orgId)));
      await recordEvent({ orgId, type: 'dunning.task.unassigned', actorId: userId ?? undefined, payload: { runId: id } });
      return NextResponse.json({ ok: true });
    }
    let members;
    try { members = await listOrgMembers(orgId, userId ?? ''); }
    catch { return NextResponse.json({ error: 'Could not load your team just now. Try again.' }, { status: 502 }); }
    const who = findMember(members, body.assigneeId);
    if (!who) return NextResponse.json({ error: 'That person is not in this organisation.' }, { status: 400 });
    await db.insert(taskAssignments)
      .values({ runId: id, orgId, assigneeId: who.id, assigneeName: who.name, assignedBy: userId ?? null })
      .onConflictDoUpdate({ target: taskAssignments.runId, set: { assigneeId: who.id, assigneeName: who.name, assignedBy: userId ?? null, assignedAt: new Date() } });
    await recordEvent({ orgId, type: 'dunning.task.assigned', actorId: userId ?? undefined, payload: { runId: id, assigneeId: who.id } });
    return NextResponse.json({ ok: true, assigneeId: who.id, assigneeName: who.name });
  }

  if (action !== 'done' && action !== 'skip') return NextResponse.json({ error: 'action must be done, skip or assign' }, { status: 400 });

  if (action === 'done') await ensureDunningControlSchema(); // the outcome table creates itself
  const closed = await db.update(dunningRuns)
    .set(action === 'done' ? { status: 'sent', sentAt: new Date() } : { status: 'cancelled', error: 'Skipped by you' })
    .where(and(eq(dunningRuns.id, id), eq(dunningRuns.orgId, orgId), eq(dunningRuns.channel, 'phone'), eq(dunningRuns.status, 'scheduled')))
    .returning({ id: dunningRuns.id, invoiceId: dunningRuns.invoiceId });
  if (closed.length === 0) return NextResponse.json({ error: 'That task is already closed, or does not exist.' }, { status: 409 });
  // What happened on the call. The task is already closed, so a failure here never reopens or fails it.
  const call = action === 'done' ? parseCallOutcome(body.outcome, body.note) : null;
  if (call && hasOutcome(call)) {
    try {
      const [inv] = await db.select({ customerId: invoices.customerId, number: invoices.number }).from(invoices).where(and(eq(invoices.id, closed[0].invoiceId), eq(invoices.orgId, orgId))).limit(1);
      await db.insert(taskOutcomes).values({ runId: id, orgId, outcome: call.outcome, note: call.note, createdBy: userId ?? null }).onConflictDoNothing();
      if (inv) await db.insert(timelineEvents).values({ orgId, customerId: inv.customerId, invoiceId: closed[0].invoiceId, actorId: userId ?? null, eventType: 'call', title: callTimelineTitle(call, inv.number), description: call.note });
    } catch (e) {
      console.error('[tasks] could not save the call outcome:', e instanceof Error ? e.message : e);
    }
  }
  await recordEvent({ orgId, type: action === 'done' ? 'dunning.task.done' : 'dunning.task.skipped', actorId: userId ?? undefined, payload: { runId: id } });
  return NextResponse.json({ ok: true });
}
