/**
 * Usage meter: one row per real send or AI call, per organization. Used for
 * unit economics only (/dashboard/admin/usage). Fails open: see
 * usage-meter-core.ts. Call sites await it, because serverless can drop
 * unawaited work, and it is bounded by a short timeout so it cannot hold a send.
 *
 * The table creates itself (ensureDunningControlSchema); drizzle/0020 holds the
 * same DDL for anyone who runs migrations.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { nanoid } from '@/lib/utils';
import { recordUsageWith, type UsageInput, type UsageRow } from '@/lib/usage-meter-core';

export { smsSegments, USAGE_KINDS, type UsageKind } from '@/lib/usage-meter-core';

async function writeRow(row: UsageRow): Promise<void> {
  await ensureDunningControlSchema();
  await db.execute(sql`
    INSERT INTO usage_events (id, org_id, kind, units, model, est_cost_micros)
    VALUES (${nanoid()}, ${row.orgId}, ${row.kind}, ${row.units}, ${row.model}, ${row.costMicros})
  `);
}

/**
 * The AI wrappers fall back to a template when Gemini fails, so a caller cannot
 * tell a real call from a fallback. With no API key there was certainly no
 * call, so nothing is recorded; with a key, an attempted call is counted
 * (a failed one may still bill), which errs on the high side.
 */
export function recordUsage(input: UsageInput): Promise<boolean> {
  if (input.kind.startsWith('ai_') && !process.env.GEMINI_API_KEY) return Promise.resolve(false);
  return recordUsageWith(writeRow, input);
}
