import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users, organizations, memberships } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

export async function ensureUserAndOrg(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId) return { error: new NextResponse('Unauthorized', { status: 401 }) };

  let [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ id: nanoid(), clerkId: userId, email: 'unknown@getcollectly.app' })
      .returning();
  }

  if (orgId) {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (org && org.ownerId !== user.id) {
      const [member] = await db
        .select()
        .from(memberships)
        .where(and(eq(memberships.userId, user.id), eq(memberships.orgId, org.id)))
        .limit(1);
      if (!member) {
        await db.insert(memberships).values({ id: nanoid(), userId: user.id, orgId: org.id, role: 'admin' });
      }
    }
    return { user, org };
  }

  return { user, org: null };
}

export function ok<T>(data: T, init?: ResponseInit) { return NextResponse.json(data, init); }
export function bad(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
