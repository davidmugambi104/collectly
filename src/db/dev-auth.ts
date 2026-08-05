/**
 * Dev-only: returns a fake auth context for the seeded demo org.
 * Used when USE_DEV_AUTH=1 is set, so the dashboard can be explored without Clerk.
 *
 * Prefers the org auto-seeded by `bootstrap-db.ts` (Lumen & Co, slug: `lumen-co`)
 * so the dashboard's data and the auth context always agree. Falls back to
 * creating `org_dev_collectly` if the bootstrap seed is skipped.
 */
import { eq, or } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { db, schema } from './index';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const DEV_USER_ID = 'user_dev_davie';
const DEV_ORG_ID = 'org_dev_collectly';

export async function getDevAuth() {
  if (process.env.USE_DEV_AUTH !== '1') return null;
  await ensureBootstrapped();

  // Reuse the auto-seeded org if it exists so the dashboard's data and
  // the auth context point at the same org.
  const [seeded] = await db
    .select()
    .from(schema.organizations)
    .where(or(eq(schema.organizations.slug, 'lumen-co'), eq(schema.organizations.id, 'org_demo_collectly')))
    .limit(1);
  if (seeded) {
    return { userId: seeded.ownerId, orgId: seeded.id };
  }

  // Make sure the dev user exists
  await db.insert(schema.users).values({
    id: DEV_USER_ID,
    clerkId: DEV_USER_ID,
    email: 'dev@collectly.app',
    name: 'Dev User',
  }).onConflictDoNothing();
  // Make sure the dev org exists
  let [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.slug, 'collectly-dev')).limit(1);
  if (!org) {
    const now = new Date();
    try {
      [org] = await db.insert(schema.organizations).values({
        id: DEV_ORG_ID,
        name: 'Your Business',
        slug: 'collectly-dev',
        baseCurrency: 'USD',
        country: 'US',
        timezone: 'UTC',
        businessType: null,
        ownerId: DEV_USER_ID,
        plan: 'starter',
        trialEndsAt: new Date(now.getTime() + 14 * 86400000),
      }).returning();
      // Create a membership so the org is fully wired
      await db.insert(schema.memberships).values({
        id: nanoid(),
        userId: DEV_USER_ID,
        orgId: DEV_ORG_ID,
        role: 'owner',
      });
      // Mirror the real signup path (ensureOrgProvisioned in auth-helper.ts)
      // so the dev shim's trial banner behaves the same as production.
      await db.insert(schema.subscriptions).values({
        id: nanoid(),
        orgId: DEV_ORG_ID,
        plan: 'starter',
        status: 'trialing',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 14 * 86400000),
      }).onConflictDoNothing();
    } catch {
      // Race: another request already created it
      [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.slug, 'collectly-dev')).limit(1);
    }
  }
  if (!org) return null;
  return { userId: org.ownerId, orgId: org.id };
}

