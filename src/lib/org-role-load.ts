import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { isOwnerOrAdmin } from '@/lib/org-role';

/** True when the signed-in user is this workspace's owner or a Clerk org admin. Used for whole-workspace export and removal. */
export async function isWorkspaceOwnerOrAdmin(a: { userId: string | null | undefined; orgId: string; orgRole?: string | null }): Promise<boolean> {
  const [org] = await db.select({ ownerId: organizations.ownerId }).from(organizations).where(eq(organizations.id, a.orgId)).limit(1);
  return isOwnerOrAdmin({ userId: a.userId, ownerId: org?.ownerId, orgRole: a.orgRole });
}
