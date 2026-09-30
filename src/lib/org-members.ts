import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { memberLabel, type OrgMember } from '@/lib/dunning/task-assignment';

/**
 * The people in an organisation, from the sign-in provider (our own
 * memberships table is only filled for the owner). In the dev shim there is
 * no provider, so it is the one dev user. If the provider cannot be reached it
 * throws: a missing list must not be mistaken for "nobody".
 */
export async function listOrgMembers(orgId: string, viewerId: string): Promise<OrgMember[]> {
  if (process.env.USE_DEV_AUTH === '1') {
    const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, viewerId)).limit(1);
    return [{ id: viewerId, name: u?.name?.trim() || 'You' }];
  }
  const client = await clerkClient();
  const out: OrgMember[] = [];
  for (let offset = 0; offset < 500; offset += 100) {
    const page = await client.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: 100, offset });
    for (const m of page.data) {
      const p = m.publicUserData;
      if (!p?.userId) continue;
      out.push({ id: p.userId, name: memberLabel(p.firstName, p.lastName, p.identifier) });
    }
    if (page.data.length < 100) break;
  }
  return out;
}
