import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { events } from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { desc, eq, and } from 'drizzle-orm';

const body = z.object({ type: z.string(), payload: z.record(z.any()).optional() });

export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!orgId) return NextResponse.json({ error: 'no org' }, { status: 400 });
  const data = body.parse(await req.json());
  const [row] = await db.insert(events).values({ id: nanoid(), orgId, type: data.type, payload: data.payload, actorId: userId }).returning();
  return NextResponse.json({ ok: true, id: row.id });
}

/**
 * List recent events for the current org.
 * Query params: limit (default 50, max 200), type (optional filter)
 */
export async function GET(req: NextRequest) {
  await ensureBootstrapped();
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!orgId) return NextResponse.json({ error: 'no org' }, { status: 400 });
  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50));
  const type = url.searchParams.get('type');
  const where = type ? and(eq(events.orgId, orgId), eq(events.type, type)) : eq(events.orgId, orgId);
  const rows = await db.select().from(events).where(where).orderBy(desc(events.createdAt)).limit(limit);
  return NextResponse.json({ count: rows.length, events: rows });
}
