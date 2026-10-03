/** Reads the usage meter for the admin page. Admin only: spans every organization. */
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { buildUsageReport, monthStartUtc, type UsageReport } from '@/lib/usage-report';

export async function loadUsageReport(now = new Date()): Promise<UsageReport> {
  await ensureDunningControlSchema();
  // Start of whichever window is longer, so one query feeds both.
  const from = new Date(Math.min(now.getTime() - 30 * 86_400_000, monthStartUtc(now).getTime()));
  const ev = await db.execute(sql`SELECT org_id, kind, units, est_cost_micros, created_at FROM usage_events WHERE created_at >= ${from.toISOString()}`);
  const orgsRes = await db.execute(sql`SELECT id, name FROM organizations`);
  const subsRes = await db.execute(sql`SELECT org_id, plan, status, stripe_subscription_id FROM subscriptions`);
  // node-postgres returns { rows }, PGlite returns { rows } too; tolerate a bare array.
  const rows = (r: unknown): Record<string, unknown>[] => (Array.isArray(r) ? r : ((r as { rows?: Record<string, unknown>[] })?.rows ?? []));
  return buildUsageReport({
    now,
    events: rows(ev).map((r) => ({ orgId: String(r.org_id), kind: String(r.kind), units: Number(r.units), costMicros: Number(r.est_cost_micros), createdAt: new Date(r.created_at as string) })),
    orgs: rows(orgsRes).map((r) => ({ id: String(r.id), name: String(r.name) })),
    subs: rows(subsRes).map((r) => ({ orgId: String(r.org_id), plan: String(r.plan), status: String(r.status), stripeSubscriptionId: (r.stripe_subscription_id as string | null) ?? null })),
  });
}
