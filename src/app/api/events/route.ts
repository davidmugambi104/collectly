import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { events } from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { desc, eq, and } from 'drizzle-orm';

const body = z.object({ type: z.string(), payload: z.record(z.any()).optional() });

export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  // Was importing `auth` straight from @clerk/nextjs/server instead of
  // this app's getAuth() wrapper. getAuth() calls ensureOrgProvisioned()
  // after every session specifically because a fresh Clerk org has no row
  // in our own `organizations` table until something creates one — every
  // other route uses getAuth() for exactly that reason. This route's own
  // insert below has orgId as a NOT NULL FK to organizations.id, so a
  // brand-new org calling this before any other org-scoped write would
  // hit the same foreign-key-violation crash that fix exists to prevent.
  const { userId, orgId } = await getAuth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!orgId) return NextResponse.json({ error: 'no org' }, { status: 400 });
  try {
    const data = body.parse(await req.json());
    const [row] = await db.insert(events).values({ id: nanoid(), orgId, type: data.type, payload: data.payload, actorId: userId }).returning();
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Bad request' }, { status: 400 });
  }
}

/**
 * List recent events for the current org.
 * Query params: limit (default 50, max 200), type (optional filter)
 */
export async function GET(req: NextRequest) {
  await ensureBootstrapped();
  const { userId, orgId } = await getAuth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!orgId) return NextResponse.json({ error: 'no org' }, { status: 400 });
  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50));
  const type = url.searchParams.get('type');
  const where = type ? and(eq(events.orgId, orgId), eq(events.type, type)) : eq(events.orgId, orgId);
  const rows = await db.select().from(events).where(where).orderBy(desc(events.createdAt)).limit(limit);
  return NextResponse.json({ count: rows.length, events: rows });
}
