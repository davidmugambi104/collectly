/**
 * Tiny helper to record domain events into the `events` table.
 * Used for audit trail, debugging, and (future) customer-facing activity feed.
 *
 * Schema (src/db/schema.ts):
 *   events(id, orgId, type, payload jsonb, actorId, createdAt)
 *
 * Conventions for `type`:
 *   - dotted notation: "dunning.run.scheduled", "dunning.run.failed", "payment.succeeded"
 *   - past-tense verb at the end
 *
 * Failures to write to events are swallowed (logged) — never break the
 * caller over an audit-log failure.
 */
import { db, schema } from '@/db';
import { events } from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { and, eq, desc, gte } from 'drizzle-orm';

export type EventType =
  | 'dunning.run.scheduled'
  | 'dunning.run.sent'
  | 'dunning.run.failed'
  | 'dunning.run.cancelled'
  | 'payment.succeeded'
  | 'payment.refunded'
  | 'payment.disputed'
  | 'invoice.created'
  | 'invoice.paid'
  | 'invoice.partial'
  | 'webhook.stripe'
  | 'auth.signed_in'
  | 'auth.signed_up'
  | 'integration.connected'
  | 'integration.disconnected';

export async function recordEvent(opts: {
  orgId: string;
  type: EventType | string;
  payload?: Record<string, unknown>;
  actorId?: string;
}): Promise<void> {
  try {
    await db.insert(events).values({
      id: nanoid(),
      orgId: opts.orgId,
      type: opts.type,
      payload: opts.payload ?? null,
      actorId: opts.actorId ?? null,
    });
  } catch (e: any) {
    // Audit log failure is non-fatal — log and move on.
    console.warn(`[events] recordEvent failed: type=${opts.type} org=${opts.orgId} err=${e?.message}`);
  }
}

/** Read recent events for an org (most recent first). */
export async function getRecentEvents(orgId: string, limit = 50) {
  return db
    .select()
    .from(events)
    .where(eq(events.orgId, orgId))
    .orderBy(desc(events.createdAt))
    .limit(limit);
}

/** Read events of a specific type within a time window. */
export async function getEventsByType(orgId: string, type: string, sinceMs: number) {
  const since = new Date(Date.now() - sinceMs);
  return db
    .select()
    .from(events)
    .where(and(eq(events.orgId, orgId), eq(events.type, type), gte(events.createdAt, since)))
    .orderBy(desc(events.createdAt));
}
