import { clerkClient } from '@clerk/nextjs/server';
import { and, eq, inArray, or } from 'drizzle-orm';
import { db } from '@/db';
import { users, memberships } from '@/db/schema';
import type { BookRef } from '@/lib/book-membership';

/** Every organization Clerk says this user belongs to now. Throws if Clerk cannot be reached. */
export async function listClerkBooks(userId: string): Promise<BookRef[]> {
  const client = await clerkClient();
  const out: BookRef[] = [];
  for (let offset = 0; offset < 500; offset += 100) {
    const page = await client.users.getOrganizationMembershipList({ userId, limit: 100, offset });
    for (const m of page.data) out.push({ orgId: m.organization.id, name: m.organization.name });
    if (page.data.length < 100) break;
  }
  return out;
}

/**
 * The users.id a Clerk user is stored under. Newer rows use the Clerk id itself; older ones have a
 * generated id with the Clerk id in clerk_id. memberships.user_id references users.id, so every
 * read and write of the cache has to go through this, never the raw Clerk id.
 */
export async function resolveUserRowId(clerkUserId: string): Promise<string | null> {
  const [row] = await db.select({ id: users.id }).from(users)
    .where(or(eq(users.id, clerkUserId), eq(users.clerkId, clerkUserId))).limit(1);
  return row?.id ?? null;
}

/**
 * Remember that this user belongs to an organization we already have a row for.
 * Cheap and idempotent; called from getAuth so the cache fills as people work.
 */
export async function recordMembership(userId: string, orgId: string, role: 'owner' | 'admin' | 'member' | 'viewer' = 'member'): Promise<void> {
  let rowId = await resolveUserRowId(userId);
  if (!rowId) {
    // A second person joining an existing org has no users row yet; the FK needs one.
    await db.insert(users).values({ id: userId, clerkId: userId, email: `${userId}@unknown.clerk.local` }).onConflictDoNothing();
    rowId = (await resolveUserRowId(userId)) ?? userId;
  }
  const [have] = await db.select({ id: memberships.id }).from(memberships)
    .where(and(eq(memberships.userId, rowId), eq(memberships.orgId, orgId))).limit(1);
  if (have) return;
  await db.insert(memberships).values({ userId: rowId, orgId, role }).onConflictDoNothing();
}

export async function dropMemberships(userId: string, orgIds: string[]): Promise<void> {
  if (orgIds.length === 0) return;
  const rowId = await resolveUserRowId(userId);
  if (!rowId) return;
  await db.delete(memberships).where(and(eq(memberships.userId, rowId), inArray(memberships.orgId, orgIds)));
}
