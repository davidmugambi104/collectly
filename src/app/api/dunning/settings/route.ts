import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { dunningSettings, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/lib/events';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { parseWindowInput } from '@/lib/dunning/send-window';

/**
 * PUT accepts either or both of:
 *   { approvalRequired: boolean }            whether reminders wait for the owner
 *   { sendWindow: { enabled, startHour, endHour, days, timezone } }
 *                                            only act during business hours
 * Anything omitted is left as it was.
 */
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

  const set: Partial<typeof dunningSettings.$inferInsert> = {};
  if ('approvalRequired' in input) {
    if (typeof input.approvalRequired !== 'boolean') {
      return NextResponse.json({ error: 'approvalRequired must be true or false' }, { status: 400 });
    }
    set.approvalRequired = input.approvalRequired;
  }
  if ('sendWindow' in input) {
    const [org] = await db.select({ tz: organizations.timezone }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    const w = parseWindowInput(input.sendWindow, org?.tz ?? 'UTC');
    if (!w.ok) return NextResponse.json({ error: w.error }, { status: 400 });
    set.sendWindowEnabled = w.value.enabled;
    set.sendWindowStart = w.value.startHour;
    set.sendWindowEnd = w.value.endHour;
    set.sendDays = w.value.days;
    set.sendTimezone = w.value.timezone;
  }
  if (Object.keys(set).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }

  const now = new Date();
  await db
    .insert(dunningSettings)
    .values({ orgId, ...set, updatedAt: now })
    .onConflictDoUpdate({ target: dunningSettings.orgId, set: { ...set, updatedAt: now } });
  await recordEvent({ orgId, type: 'dunning.settings.updated', actorId: userId ?? undefined, payload: set as Record<string, unknown> });
  return NextResponse.json({ ok: true, ...set });
}
