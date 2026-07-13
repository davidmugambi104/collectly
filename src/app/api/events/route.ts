import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { events } from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';

const schema = z.object({ type: z.string(), payload: z.record(z.any()).optional() });

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!orgId) return NextResponse.json({ error: 'no org' }, { status: 400 });
  const body = await req.json();
  const data = schema.parse(body);
  const [row] = await db.insert(events).values({ id: nanoid(), orgId, type: data.type, payload: data.payload, actorId: userId }).returning();
  return NextResponse.json({ ok: true, id: row.id });
}
