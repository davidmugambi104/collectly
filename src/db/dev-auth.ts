/**
 * Dev-only: returns a fake auth context for the seeded demo org.
 * Used when USE_DEV_AUTH=1 is set, so the dashboard can be explored without Clerk.
 */
import { eq } from 'drizzle-orm';
import { db, schema } from './client';

export async function getDevAuth() {
  if (process.env.USE_DEV_AUTH !== '1') return null;
  const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.slug, 'lumen-co')).limit(1);
  if (!org) return null;
  return { userId: org.ownerId, orgId: org.id };
}
