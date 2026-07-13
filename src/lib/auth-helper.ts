/**
 * Auth helper. In dev (USE_DEV_AUTH=1), returns the seeded demo org.
 * In prod, defers to Clerk.
 */
import { auth } from '@clerk/nextjs/server';
import { getDevAuth } from '@/db/dev-auth';

export async function getAuth() {
  if (process.env.USE_DEV_AUTH === '1') {
    const dev = await getDevAuth();
    if (dev) return dev;
  }
  return await auth();
}
