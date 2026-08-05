/**
 * Auth helper. In dev (USE_DEV_AUTH=1), always returns the dev org.
 * In prod, defers to Clerk.
 *
 * `getAuthWithOrg()` ensures the user has a Clerk organization. If they
 * don't (e.g. signed up via Google without an org), it creates a
 * personal org, sets it as the active org for the session, and returns
 * the auth context with the new orgId. Used by the dashboard page to
 * prevent the orgId-required redirect loop.
 */
import { auth, currentUser } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getDevAuth } from '@/db/dev-auth';
import { db } from '@/db';
import { users, organizations, deletedOrgsLog, subscriptions } from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { eq } from 'drizzle-orm';

// Admin emails allowed to hit internal/admin-only routes (lead exports,
// upgrade-request review, etc). Same allowlist as src/app/admin/upgrade-requests.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'davie@getcollectly.app')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// SECURITY: refuse to enable the dev shim in production. We check this
// lazily (on first call) rather than at module load, because Next.js
// loads helpers at build time even for production builds. The first
// runtime request in production with USE_DEV_AUTH=1 will throw a 500,
// which is loud and obvious.
function devShimEnabled(): boolean {
  if (process.env.USE_DEV_AUTH === '1' && process.env.NODE_ENV === 'production') {
    console.error(
      'FATAL: USE_DEV_AUTH=1 is set in production. Disable it (set USE_DEV_AUTH=0 or remove) before the next deploy.'
    );
    return false;
  }
  return true;
}

// Bug that caused this: getAuthWithOrg() below can create a brand-new
// Clerk organization, and users can also create one directly through
// Clerk's own <OrganizationSwitcher> UI (see src/components/app/shell.tsx)
// — neither path ever inserted a matching row into our own `organizations`
// table. Nothing in the app did; the only production webhook handler
// (/api/webhooks/clerk) only reacts to `organization.deleted`, not
// `.created`. A session would come back with a perfectly valid Clerk
// orgId that had no corresponding DB row at all, and the first org-scoped
// INSERT for that org (e.g. the dunning page auto-creating its default
// sequence) would fail with a foreign-key violation and crash the page
// for every new user — not a rare race, a guaranteed miss.
//
// Fixed at the root: both getAuth() and getAuthWithOrg() call this before
// returning. It's a no-op after the first successful run for a given org
// (cheap indexed SELECT), and self-heals any org missing its row instead
// of depending on webhook delivery. Same fix covers the matching gap for
// `users` rows, since organizations.owner_id is itself a NOT NULL FK to
// users.id — nothing in production ever inserted those either.
export async function ensureOrgProvisioned(userId: string, orgId: string): Promise<void> {
  const [existingOrg] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (existingOrg) return;

  // A deleted org's Clerk-side record can outlive its DB row: DELETE
  // /api/account/delete removes the DB data first, then deletes the Clerk
  // organization as a best-effort second step — if that second step fails
  // (transient Clerk API issue), the Clerk org still exists, and the very
  // next authenticated request from anyone still holding a session for it
  // would otherwise land right here and silently re-provision a brand-new
  // row under the same orgId (placeholder name, fresh 14-day trial) with
  // zero user action. That's a data-deletion promise (this app's own
  // /privacy page cites it) quietly undoing itself. deleted_orgs_log is
  // the durable marker cascadeDeleteOrgData() writes specifically to make
  // this distinguishable from a genuinely new org.
  try {
    const [wasDeleted] = await db.select({ id: deletedOrgsLog.id }).from(deletedOrgsLog).where(eq(deletedOrgsLog.orgId, orgId)).limit(1);
    if (wasDeleted) {
      throw new Error(`Organization ${orgId} was deleted and cannot be re-provisioned automatically. Contact support if this is unexpected.`);
    }
  } catch (e: unknown) {
    // Table not created yet (no deletion has ever happened in this
    // environment) is not itself a reason to block provisioning.
    const code = (e as { code?: string })?.code;
    if (code !== '42P01') throw e; // 42P01 = undefined_table
  }

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!existingUser) {
    const cu = await currentUser();
    const email = cu?.emailAddresses?.[0]?.emailAddress ?? `${userId}@unknown.clerk.local`;
    const name = cu ? [cu.firstName, cu.lastName].filter(Boolean).join(' ') || cu.username || null : null;
    await db.insert(users).values({ id: userId, clerkId: userId, email, name }).onConflictDoNothing();
  }

  let orgName = 'Your workspace';
  let orgSlug = orgId;
  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    orgName = org.name || orgName;
    orgSlug = org.slug || orgId;
  } catch (e: unknown) {
    // Clerk lookup failing is rare and shouldn't block provisioning — a
    // row with a placeholder name (fixable later) beats every write for
    // this org crashing forever, which is the status quo without it.
    console.error('[auth] Clerk org lookup failed during provisioning, using placeholder name:', e instanceof Error ? e.message : e);
  }
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 86400000);
  await db.insert(organizations).values({
    id: orgId,
    name: orgName,
    slug: orgSlug,
    ownerId: userId,
    plan: 'starter',
    trialEndsAt,
  }).onConflictDoNothing();

  // Without this, the trial nudge in the dashboard sidebar
  // (src/components/app/shell.tsx, via /api/billing/trial-status) and the
  // trial countdown on the billing page both read from `subscriptions`,
  // not `organizations.trialEndsAt` — and nothing else ever inserted a
  // subscriptions row for a real signup (only the sample-data seeder did,
  // in bootstrap-db.ts). So `organizations.trialEndsAt` was set correctly
  // on every org but never actually surfaced or enforced anywhere: the
  // trial silently never appeared and never "ended" for any real user.
  await db.insert(subscriptions).values({
    id: nanoid(),
    orgId,
    plan: 'starter',
    status: 'trialing',
    currentPeriodStart: now,
    currentPeriodEnd: trialEndsAt,
  }).onConflictDoNothing();
}

export async function getAuth() {
  if (!devShimEnabled()) {
    throw new Error('Dev auth shim is disabled in production');
  }
  if (process.env.USE_DEV_AUTH === '1') {
    const dev = await getDevAuth();
    if (dev) return dev;
    // In dev mode without a dev org, return a synthetic dev session
    // rather than falling through to Clerk (which requires middleware)
    return { userId: 'user_dev_davie', orgId: 'org_dev_collectly' };
  }
  const session = await auth();
  if (session.userId && session.orgId) {
    await ensureOrgProvisioned(session.userId, session.orgId);
  }
  return session;
}

/**
 * Get auth context, auto-creating a personal Clerk org if the user
 * doesn't have one. Returns null if not signed in.
 */
export async function getAuthWithOrg() {
  if (!devShimEnabled()) {
    throw new Error('Dev auth shim is disabled in production');
  }
  if (process.env.USE_DEV_AUTH === '1') {
    const dev = await getDevAuth();
    if (dev) return { userId: dev.userId, orgId: dev.orgId, user: null };
    return { userId: 'user_dev_davie', orgId: 'org_dev_collectly', user: null };
  }

  const session = await auth();
  if (!session.userId) return null;

  if (session.orgId) {
    await ensureOrgProvisioned(session.userId, session.orgId);
    return { userId: session.userId, orgId: session.orgId, user: null };
  }

  // No org: create a personal one
  const user = await currentUser();
  if (!user) return null;

  const client = await clerkClient();
  const baseName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.username ||
    user.emailAddresses?.[0]?.emailAddress?.split('@')[0] ||
    'My workspace';
  const slugBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'workspace';
  const slug = `${slugBase}-${user.id.slice(-6)}`;

  try {
    const org = await client.organizations.createOrganization({
      name: `${baseName}'s workspace`,
      slug,
      createdBy: user.id,
    });
    await ensureOrgProvisioned(session.userId, org.id);
    return { userId: session.userId, orgId: org.id, user: null };
  } catch (err) {
    // If the slug collides (extremely rare with user-id suffix), try once
    // more with a random suffix before giving up.
    const fallbackSlug = `${slugBase}-${Math.random().toString(36).slice(2, 8)}`;
    const org = await client.organizations.createOrganization({
      name: `${baseName}'s workspace`,
      slug: fallbackSlug,
      createdBy: user.id,
    });
    await ensureOrgProvisioned(session.userId, org.id);
    return { userId: session.userId, orgId: org.id, user: null };
  }
}

/**
 * SECURITY: gate for internal/admin-only routes (waitlist + interview lead
 * exports, upgrade-request review, etc). `getAuth()`/`getAuthWithOrg()` only
 * prove the caller is *a* signed-in member of *some* org — every paying
 * customer satisfies that. These routes return cross-tenant data (all
 * interview leads, all upgrade requests) that belongs to the Collectly team
 * only, so they need a real allowlist check, not just "is logged in".
 * Mirrors the check already used by src/app/admin/upgrade-requests.
 */
export async function requireAdminEmail(): Promise<{ ok: true; email: string } | { ok: false }> {
  const { userId } = await getAuth();
  if (!userId) return { ok: false };
  const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const email = u?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) return { ok: false };
  return { ok: true, email };
}
