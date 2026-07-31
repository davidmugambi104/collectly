import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { recordEvent } from '@/lib/events';

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
 * NOTE: this deletes application data only. Deleting the Clerk user/org is a
 * separate call against Clerk's API and should be wired before GA — see the
 * TODO below. Until then the operator must also remove the Clerk org.
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

  // Best-effort audit trail written BEFORE the cascade removes the events rows,
  // so at minimum the deletion intent is visible in logs.
  try {
    await recordEvent({
      orgId,
      type: 'account.deleted',
      payload: { orgName: org.name, at: new Date().toISOString() },
    });
  } catch {
    // Never block a deletion request on analytics.
  }
  console.warn('[account.delete] deleting org', orgId, org.name);

  try {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  } catch (e: any) {
    console.error('[account.delete] failed:', e?.message ?? e);
    return NextResponse.json({ error: 'deletion failed' }, { status: 500 });
  }

  // TODO(before GA): also delete the Clerk organization + memberships via the
  // Clerk Backend API so auth records don't outlive the application data.
  return NextResponse.json({ ok: true, deleted: orgId });
}