import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { dunningRuns } from '@/db/schema';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { recordEvent } from '@/lib/events';

/** PATCH { action: 'done' | 'skip' } closes a call task. Only an open task in the caller's own org. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  let action: unknown;
  try { action = (await req.json())?.action; } catch { /* handled below */ }
  if (action !== 'done' && action !== 'skip') return NextResponse.json({ error: 'action must be done or skip' }, { status: 400 });

  const closed = await db.update(dunningRuns)
    .set(action === 'done' ? { status: 'sent', sentAt: new Date() } : { status: 'cancelled', error: 'Skipped by you' })
    .where(and(eq(dunningRuns.id, id), eq(dunningRuns.orgId, orgId), eq(dunningRuns.channel, 'phone'), eq(dunningRuns.status, 'scheduled')))
    .returning({ id: dunningRuns.id });
  if (closed.length === 0) return NextResponse.json({ error: 'That task is already closed, or does not exist.' }, { status: 409 });
  await recordEvent({ orgId, type: action === 'done' ? 'dunning.task.done' : 'dunning.task.skipped', actorId: userId ?? undefined, payload: { runId: id } });
  return NextResponse.json({ ok: true });
}
