import { db, pool } from '@/db';
import { subscriptions, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import type { SubStore, EventStore, SubRow } from '@/lib/stripe-webhook';

const cols = {
  id: subscriptions.id, orgId: subscriptions.orgId, plan: subscriptions.plan, status: subscriptions.status,
  stripeCustomerId: subscriptions.stripeCustomerId, stripeSubscriptionId: subscriptions.stripeSubscriptionId,
};

export const dbSubStore: SubStore = {
  async findByStripeSubscriptionId(id) {
    const [r] = await db.select(cols).from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, id)).limit(1);
    return (r as SubRow | undefined) ?? null;
  },
  async findByOrgId(orgId) {
    const [r] = await db.select(cols).from(subscriptions).where(eq(subscriptions.orgId, orgId)).limit(1);
    return (r as SubRow | undefined) ?? null;
  },
  async update(rowId, patch) {
    await db.update(subscriptions).set({ ...patch, plan: patch.plan as never, updatedAt: new Date() }).where(eq(subscriptions.id, rowId));
  },
  async insert(row) {
    await db.insert(subscriptions).values({ id: nanoid(), ...row, plan: row.plan as never });
  },
  async setOrgPlan(orgId, plan) {
    await db.update(organizations).set({ plan: plan as never, updatedAt: new Date() }).where(eq(organizations.id, orgId));
  },
};

/** Atomic claim on Stripe's event id. The table is created on first use if the bootstrap has not run. */
export const pgEventStore: EventStore = {
  async claim(eventId) {
    const client = await pool().connect();
    try {
      const run = () => client.query(`INSERT INTO webhook_events_seen (svix_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING svix_id`, [eventId]);
      try {
        return (await run()).rows.length > 0;
      } catch (e: unknown) {
        if ((e as { code?: string })?.code !== '42P01') throw e;
        await client.query(`CREATE TABLE IF NOT EXISTS webhook_events_seen (svix_id TEXT PRIMARY KEY, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
        return (await run()).rows.length > 0;
      }
    } finally {
      client.release();
    }
  },
  async release(eventId) {
    const client = await pool().connect();
    try {
      await client.query(`DELETE FROM webhook_events_seen WHERE svix_id = $1`, [eventId]);
    } finally {
      client.release();
    }
  },
};
