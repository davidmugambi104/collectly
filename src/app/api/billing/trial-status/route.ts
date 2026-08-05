import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Backs the sidebar trial nudge in src/components/app/shell.tsx. That box
 * used to hardcode "Trial · 13 days left" for every org on every page,
 * including orgs that already upgraded — this is the real number instead,
 * computed the same way src/app/dashboard/billing/page.tsx does.
 */
export async function GET() {
  const { userId, orgId } = await getAuth();
  if (!userId || !orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId)).limit(1);
  const isTrialing = sub?.status === 'trialing';
  const daysLeft = sub?.currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / 86400000))
    : 0;

  return NextResponse.json({ isTrialing, daysLeft });
}
