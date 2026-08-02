import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customers, timelineEvents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const body = z.object({
  customerId: z.string().min(1),
  note: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const data = body.parse(await req.json());

  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, data.customerId), eq(customers.orgId, orgId)))
    .limit(1);
  if (!customer) return NextResponse.json({ error: 'customer not found' }, { status: 404 });

  const [event] = await db.insert(timelineEvents).values({
    id: nanoid(),
    orgId,
    customerId: data.customerId,
    eventType: 'note_added',
    title: 'Note added',
    description: data.note,
  }).returning();

  return NextResponse.json({ ok: true, id: event.id });
}
