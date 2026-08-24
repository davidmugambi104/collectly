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
import { users } from '@/db/schema';
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
  return await auth();
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
    return { userId: session.userId, orgId: org.id, user: null };
  } catch  {
    // If the slug collides (extremely rare with user-id suffix), try once
    // more with a random suffix before giving up.
    const fallbackSlug = `${slugBase}-${Math.random().toString(36).slice(2, 8)}`;
    const org = await client.organizations.createOrganization({
      name: `${baseName}'s workspace`,
      slug: fallbackSlug,
      createdBy: user.id,
    });
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
