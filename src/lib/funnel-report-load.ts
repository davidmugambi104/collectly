/** Reads the rows for the admin funnel page. Admin only: spans every organization. Ids, plans and timestamps, no customer data. */
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { buildFunnelReport, DAY_MS, type WindowReport } from '@/lib/funnel-report';

const TYPES = ['auth.signed_up', 'integration.connected', 'integration.synced', 'dunning.run.awaiting_approval', 'dunning.run.approved', 'dunning.run.sent', 'payment.succeeded', 'billing.cancel_requested'];

export async function loadFunnelReport(now = new Date()): Promise<{ windows: WindowReport[]; eventRows: number }> {
  const from = new Date(now.getTime() - 90 * DAY_MS).toISOString();
  const rows = (r: unknown): Record<string, unknown>[] => (Array.isArray(r) ? r : ((r as { rows?: Record<string, unknown>[] })?.rows ?? []));
  const typeList = sql.join(TYPES.map((t) => sql`${t}`), sql`, `);
  const ev = rows(await db.execute(sql`SELECT org_id, type, payload, created_at FROM events WHERE created_at >= ${from} AND type IN (${typeList})`));
  const orgs = rows(await db.execute(sql`SELECT id, name, plan, created_at FROM organizations`));
  const subs = rows(await db.execute(sql`SELECT org_id, plan FROM subscriptions`));
  const mem = rows(await db.execute(sql`SELECT user_id, org_id FROM memberships`));
  const windows = buildFunnelReport({
    now,
    events: ev.map((r) => ({ orgId: String(r.org_id), type: String(r.type), payload: r.payload, createdAt: new Date(r.created_at as string) })),
    orgs: orgs.map((r) => ({ id: String(r.id), name: String(r.name), plan: String(r.plan), createdAt: new Date(r.created_at as string) })),
    subs: subs.map((r) => ({ orgId: String(r.org_id), plan: String(r.plan) })),
    memberships: mem.map((r) => ({ userId: String(r.user_id), orgId: String(r.org_id) })),
  });
  return { windows, eventRows: ev.length };
}
