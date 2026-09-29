import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { dunningSettings } from '@/db/schema';
import { recordEvent } from '@/lib/events';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';

/** PUT { approvalRequired: boolean }: whether reminders wait for the owner. */
export async function PUT(req: NextRequest) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let input: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === 'object') input = parsed as Record<string, unknown>;
  } catch { /* handled below */ }
  if (typeof input.approvalRequired !== 'boolean') {
    return NextResponse.json({ error: 'approvalRequired must be true or false' }, { status: 400 });
  }

  const now = new Date();
  await db
    .insert(dunningSettings)
    .values({ orgId, approvalRequired: input.approvalRequired, updatedAt: now })
    .onConflictDoUpdate({ target: dunningSettings.orgId, set: { approvalRequired: input.approvalRequired, updatedAt: now } });
  await recordEvent({ orgId, type: 'dunning.settings.updated', actorId: userId ?? undefined, payload: { approvalRequired: input.approvalRequired } });
  return NextResponse.json({ ok: true, approvalRequired: input.approvalRequired });
}
