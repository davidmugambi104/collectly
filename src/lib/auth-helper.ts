/**
 * Auth helper. In dev (USE_DEV_AUTH=1), always returns the dev org.
 * In prod, defers to Clerk.
 */
import { auth } from '@clerk/nextjs/server';
import { getDevAuth } from '@/db/dev-auth';

export async function getAuth() {
  if (process.env.USE_DEV_AUTH === '1') {
    const dev = await getDevAuth();
    if (dev) return dev;
    // In dev mode without a dev org, return a synthetic dev session
    // rather than falling through to Clerk (which requires middleware)
    return { userId: 'user_dev_davie', orgId: 'org_dev_collectly' };
  }
  return await auth();
}
