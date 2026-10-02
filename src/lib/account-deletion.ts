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
import { organizations, deletedOrgsLog, integrations } from '@/db/schema';
import { disconnectQbo } from '@/lib/integrations/quickbooks';
import { disconnectXero } from '@/lib/integrations/xero';
import { disconnectSquare } from '@/lib/integrations/square';
import { eq } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

export type CascadeDeleteResult =
  | { deleted: true; orgId: string; orgName: string }
  | { deleted: false; orgId: string };

/**
 * Revoke our access at the accounting provider BEFORE the cascade removes the stored
 * tokens. Deleting the integrations row alone used to leave Mugavi authorised at
 * Intuit, Xero and Square with nothing left on our side able to revoke it. Best effort,
 * same as a manual Disconnect: a provider outage must never block someone from deleting
 * their data. Runs for BOTH deletion paths (in-app delete and the Clerk
 * organization.deleted webhook) because both go through cascadeDeleteOrgData.
 */
async function revokeProviderAccess(orgId: string): Promise<void> {
  try {
    const rows = await db.select({ provider: integrations.provider }).from(integrations).where(eq(integrations.orgId, orgId));
    for (const r of rows) {
      try {
        if (r.provider === 'quickbooks') await disconnectQbo(orgId);
        else if (r.provider === 'xero') await disconnectXero(orgId);
        else if (r.provider === 'square') await disconnectSquare(orgId);
      } catch (e: unknown) {
        console.error(`[account-deletion] revoke ${r.provider} failed (continuing):`, e instanceof Error ? e.message : e);
      }
    }
  } catch (e: unknown) {
    console.error('[account-deletion] could not list integrations to revoke (continuing):', e instanceof Error ? e.message : e);
  }
}

export async function cascadeDeleteOrgData(
  orgId: string,
  opts?: { reason?: string },
): Promise<CascadeDeleteResult> {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org) {
    return { deleted: false, orgId };
  }

  await revokeProviderAccess(orgId);

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
