/**
 * Store the unapplied credit an accounting sync found, one row per customer and
 * currency, replacing what was there. Both syncs call this with what they read;
 * if they could not read credits they must NOT call it, so a failed fetch never
 * wipes real credit and starts the chasing again.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { customers, customerCredits } from '@/db/schema';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { groupCredits, type FoundCredit } from '@/lib/dunning/credit';

export type { FoundCredit };

export async function replaceCredits(orgId: string, found: FoundCredit[]): Promise<number> {
  await ensureDunningControlSchema();
  const grouped = groupCredits(found);
  const ids = [...new Set(grouped.map((g) => g.customerExternalId))];
  const rows: Array<{ id: string; externalId: string | null }> = ids.length
    ? await db.select({ id: customers.id, externalId: customers.externalId }).from(customers)
        .where(and(eq(customers.orgId, orgId), inArray(customers.externalId, ids)))
    : [];
  const idByExternal = new Map(rows.map((r) => [r.externalId, r.id]));
  await db.delete(customerCredits).where(eq(customerCredits.orgId, orgId));
  let stored = 0;
  for (const g of grouped) {
    const customerId = idByExternal.get(g.customerExternalId);
    if (!customerId) continue;
    await db.insert(customerCredits).values({ customerId, orgId, currency: g.currency, amount: g.amount.toFixed(2) })
      .onConflictDoUpdate({ target: [customerCredits.customerId, customerCredits.currency], set: { amount: g.amount.toFixed(2), updatedAt: new Date() } });
    stored++;
  }
  return stored;
}
