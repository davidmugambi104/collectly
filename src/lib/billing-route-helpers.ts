import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { subscriptions, organizations, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth-helper';
import { loadBookCount, loadCachedBookCount } from '@/lib/practice-load';

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
}

/** Same-origin check for form posts that start a Stripe session. A missing Origin is allowed (server-side callers). */
export function sameOrigin(req: NextRequest): boolean {
  const o = req.headers.get('origin');
  if (!o) return true;
  try {
    return new URL(o).host === new URL(appUrl() || req.url).host;
  } catch {
    return false;
  }
}

export async function requireSession() {
  const { userId, orgId } = await getAuth();
  if (!userId || !orgId) return null;
  return { userId, orgId };
}

export async function loadSub(orgId: string) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId)).limit(1);
  return sub ?? null;
}

export async function loadOwnerEmail(orgId: string): Promise<string | null> {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org) return null;
  const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, org.ownerId)).limit(1);
  return u?.email ?? null;
}

export async function countBooks(userId: string): Promise<number> {
  return loadBookCount(userId).catch(() => loadCachedBookCount(userId)).catch(() => 1);
}

/** Form posts get a redirect, fetch callers get JSON. */
export function respond(req: NextRequest, to: { url?: string; error?: string; status?: number; fallback: string }) {
  const wantsJson = (req.headers.get('accept') ?? '').includes('application/json');
  if (wantsJson) {
    return NextResponse.json(to.error ? { error: to.error } : { url: to.url }, { status: to.error ? to.status ?? 400 : 200 });
  }
  return NextResponse.redirect(to.url ?? to.fallback, 303);
}
