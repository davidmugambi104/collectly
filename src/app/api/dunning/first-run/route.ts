import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { dunningRuns, dunningSequences } from '@/db/schema';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { isDefaultSequence } from '@/lib/dunning/org-settings';
import { findPreset } from '@/lib/dunning/presets';
import { processDunning } from '@/lib/dunning/scheduler';
import { recordEvent } from '@/lib/events';
import { nanoid } from '@/lib/utils';

// Drafting calls the AI once per invoice. A few dozen fits comfortably inside a
// request; the daily run picks up the rest.
const MAX_DRAFTS = 25;

/**
 * First run: set the default schedule to a starter preset, then draft reminders
 * for the invoices that are already overdue. Drafts only. They land in the
 * approval queue and nothing is sent, whatever the approval setting is.
 *
 * Refuses once the org has any reminder on record, so it can never overwrite a
 * schedule the owner has been running.
 */
export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const preset = findPreset((body as { preset?: unknown })?.preset);
  if (!preset) return NextResponse.json({ error: 'Pick one of the starter schedules.' }, { status: 400 });

  const [existingRun] = await db.select({ id: dunningRuns.id }).from(dunningRuns).where(eq(dunningRuns.orgId, orgId)).limit(1);
  if (existingRun) {
    return NextResponse.json({ error: 'You already have reminders on record, so the starter set-up is closed. Edit your schedule instead.' }, { status: 409 });
  }

  const [seq] = await db.select().from(dunningSequences).where(and(eq(dunningSequences.orgId, orgId), isDefaultSequence)).limit(1);
  if (seq) {
    await db.update(dunningSequences).set({ steps: preset.steps, isActive: true, updatedAt: new Date() }).where(and(eq(dunningSequences.id, seq.id), eq(dunningSequences.orgId, orgId)));
  } else {
    await db.insert(dunningSequences).values({ id: nanoid(), orgId, name: 'Default', isActive: true, steps: preset.steps, pauseOnReply: true, pauseOnPayment: true });
  }

  const result = await processDunning({ orgId, draftOnly: true, maxDrafts: MAX_DRAFTS });
  await recordEvent({ orgId, type: 'dunning.first_run', actorId: userId ?? undefined, payload: { preset: preset.id, drafted: result.awaitingApproval } });
  return NextResponse.json({ ok: true, preset: preset.id, drafted: result.awaitingApproval, errors: result.errors, capped: result.awaitingApproval >= MAX_DRAFTS });
}
