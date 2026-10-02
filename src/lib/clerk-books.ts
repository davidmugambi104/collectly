import { clerkClient } from '@clerk/nextjs/server';
import { and, eq, inArray } from 'drizzle-orm';
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
 * Remember that this user belongs to an organization we already have a row for.
 * Cheap and idempotent; called from getAuth so the cache fills as people work.
 */
export async function recordMembership(userId: string, orgId: string, role: 'owner' | 'admin' | 'member' | 'viewer' = 'member'): Promise<void> {
  const [have] = await db.select({ id: memberships.id }).from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId))).limit(1);
  if (have) return;
  // The FK needs a users row; a second person joining an existing org has none yet.
  await db.insert(users).values({ id: userId, clerkId: userId, email: `${userId}@unknown.clerk.local` }).onConflictDoNothing();
  await db.insert(memberships).values({ userId, orgId, role }).onConflictDoNothing();
}

export async function dropMemberships(userId: string, orgIds: string[]): Promise<void> {
  if (orgIds.length === 0) return;
  await db.delete(memberships).where(and(eq(memberships.userId, userId), inArray(memberships.orgId, orgIds)));
}
