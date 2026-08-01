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
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/lib/events';

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

  // Best-effort audit trail written BEFORE the cascade removes the events
  // rows, so at minimum the deletion intent is visible in logs.
  try {
    await recordEvent({
      orgId,
      type: 'account.deleted',
      payload: { orgName: org.name, reason: opts?.reason ?? 'unspecified', at: new Date().toISOString() },
    });
  } catch {
    // Never block a deletion request on analytics.
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
