/**
 * Database-touching wrappers around connection-health.ts's pure rules. Kept
 * separate so the pure logic (pickBroken) can be unit tested under plain
 * `node --test`, which has no "@/" alias resolution -- this file uses it
 * freely because its own tests run through the tsx child-process pattern
 * (see scheduler-connection-health.test.ts).
 */
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { pickBroken, type AccountingProvider, type BrokenConnection, type SyncSummary } from './connection-health';

export type { AccountingProvider, BrokenConnection, SyncSummary };

export async function brokenAccountingConnections(orgId: string): Promise<BrokenConnection[]> {
  const rows = await db
    .select({ provider: integrations.provider, status: integrations.status })
    .from(integrations)
    .where(and(eq(integrations.orgId, orgId), inArray(integrations.provider, ['quickbooks', 'xero'])));
  return pickBroken(orgId, rows as Array<{ provider: string; status: string }>);
}

/**
 * Persists what the last sync did into integrations.metadata.lastSync, merged
 * with whatever else metadata already holds (tenantName, refreshExpiresAt).
 * This is what the card reads on a plain page load -- the "Imported N
 * customers..." line under the Sync button is only ever in React state, so a
 * reload (or a different tab, or the next day) used to lose it completely,
 * including a partial failure like `customers:` or `credit:` errors.
 */
export async function recordSyncSummary(orgId: string, provider: AccountingProvider, summary: SyncSummary): Promise<void> {
  const [row] = await db.select({ id: integrations.id, metadata: integrations.metadata }).from(integrations)
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, provider))).limit(1);
  if (!row) return;
  const existing = (row.metadata as Record<string, unknown> | null) ?? {};
  await db.update(integrations).set({
    metadata: { ...existing, lastSync: summary },
    updatedAt: new Date(),
  }).where(eq(integrations.id, row.id));
}
