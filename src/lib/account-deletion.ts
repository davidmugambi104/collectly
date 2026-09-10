/**
 * Shared cascade-delete logic for removing an organization's app data.
 *
 * Every child table (customers, invoices, payments, dunning_sequences,
 * dunning_runs, integrations, events, …) declares
 * `references(() => organizations.id, { onDelete: 'cascade' })`, so
 * removing the `organizations` row removes the tenant's data in one
 * transaction.
 *
 * Called from two entry points that both need identical behavior:
 *  - POST /api/account/delete — user-initiated deletion from Settings.
 *  - POST /api/webhooks/clerk — `organization.deleted`, fired when an org
 *    is deleted directly in Clerk's dashboard, outside the app. Without
 *    this, app data for an org deleted that way would be orphaned forever
 *    (nothing else observes that event).
 *
 * Idempotent: if the org row is already gone — e.g. the in-app flow ran
 * first and its own best-effort Clerk delete is what triggers the
 * `organization.deleted` webhook afterward — this is a no-op.
 */
import { db, pool } from '@/db';
import { organizations, deletedOrgsLog } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

export type CascadeDeleteResult =
  | { deleted: true; orgId: string; orgName: string }
  | { deleted: false; orgId: string };

export async function cascadeDeleteOrgData(
  orgId: string,
  opts?: { reason?: string },
): Promise<CascadeDeleteResult> {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org) {
    return { deleted: false, orgId };
  }

  // Durable audit trail, written BEFORE the cascade. Was recordEvent() into
  // the `events` table — but events.orgId is ON DELETE CASCADE like every
  // other child table, so that row was deleted one statement later by the
  // very cascade it existed to record, leaving zero queryable evidence an
  // org was ever deleted. deleted_orgs_log.org_id is deliberately a plain
  // column, not a foreign key, so it survives. Self-creates its table on
  // first use in production (see wasEventAlreadyProcessed in
  // outreach-inbound.ts for the same pattern and why: no reliable way to
  // run a migration against production from outside the running app).
  try {
    if (process.env.USE_PGLITE === '1') {
      await db.insert(deletedOrgsLog).values({
        id: nanoid(), orgId, orgName: org.name, reason: opts?.reason ?? 'unspecified',
      });
    } else {
      const client = await pool().connect();
      try {
        const insert = () => client.query(
          `INSERT INTO deleted_orgs_log (id, org_id, org_name, reason) VALUES ($1, $2, $3, $4)`,
          [nanoid(), orgId, org.name, opts?.reason ?? 'unspecified'],
        );
        try {
          await insert();
        } catch (e: unknown) {
          const code = (e as { code?: string })?.code;
          if (code !== '42P01') throw e; // 42P01 = undefined_table
          await client.query(`CREATE TABLE IF NOT EXISTS deleted_orgs_log (id text PRIMARY KEY, org_id text NOT NULL, org_name text NOT NULL, reason text, deleted_at timestamptz NOT NULL DEFAULT now())`);
          await insert();
        }
      } finally {
        client.release();
      }
    }
  } catch (e: unknown) {
    // Never block a deletion request on the audit write itself.
    console.error('[account.delete] failed to write deleted_orgs_log:', e instanceof Error ? e.message : e);
  }

  console.warn(
    '[account.delete] deleting org',
    orgId,
    org.name,
    opts?.reason ? `(reason: ${opts.reason})` : '',
  );

  await db.delete(organizations).where(eq(organizations.id, orgId));

  return { deleted: true, orgId, orgName: org.name };
}
