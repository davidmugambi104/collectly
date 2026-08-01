import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { cascadeDeleteOrgData } from '@/lib/account-deletion';
import { clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/account/delete
 * Body: { confirm: "<org name>" }
 *
 * COMPLIANCE: /privacy states "You can delete your account at any time from
 * Settings. We delete all associated data within 30 days." Until this route
 * existed that was an unfulfillable promise — a GDPR/UK-GDPR Art. 17 exposure
 * given UK customers are in the target market.
 *
 * Deletion is immediate and cascading. Every child table (customers, invoices,
 * payments, dunning_sequences, dunning_runs, integrations, events, …) declares
 * `references(() => organizations.id, { onDelete: 'cascade' })`, so removing
 * the organization row removes the tenant's data in one transaction.
 *
 * We also delete the Clerk organization so the user's auth record doesn't
 * outlive their application data. The Clerk delete is best-effort — if it
 * fails (e.g. transient Clerk API outage), the application data is already
 * gone, so we surface the failure to the operator rather than to the user.
 */
const schema = z.object({ confirm: z.string().min(1) });

export async function POST(req: NextRequest) {
  await ensureBootstrapped();

  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'confirm is required' }, { status: 400 });
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Typed confirmation: the user must retype the org name exactly. Prevents a
  // stray POST (or a CSRF-shaped request) from destroying a tenant.
  if (body.confirm.trim() !== org.name.trim()) {
    return NextResponse.json(
      { error: 'confirmation does not match the organization name' },
      { status: 400 },
    );
  }

  // App-data cascade delete — shared with the /api/webhooks/clerk
  // `organization.deleted` handler (see src/lib/account-deletion.ts) so
  // both entry points (in-app delete, org deleted directly in Clerk's
  // dashboard) behave identically.
  try {
    await cascadeDeleteOrgData(orgId, { reason: 'user_requested' });
  } catch (e: any) {
    console.error('[account.delete] failed:', e?.message ?? e);
    return NextResponse.json({ error: 'deletion failed' }, { status: 500 });
  }

  // Also remove the Clerk organization so the user's auth record doesn't
  // outlive the application data. Best-effort: application data is already
  // gone, so a Clerk API failure is logged but does not roll back the
  // user-visible success. The operator must reconcile via Clerk dashboard.
  try {
    const client = await clerkClient();
    await client.organizations.deleteOrganization(orgId);
  } catch (e: any) {
    console.error(
      '[account.delete] Clerk org delete failed (app data already removed):',
      e?.errors?.[0]?.message ?? e?.message ?? e,
    );
  }

  return NextResponse.json({ ok: true, deleted: orgId });
}