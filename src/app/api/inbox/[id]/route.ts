import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { inboxMessages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const body = z.object({
  status: z.enum(['handled', 'dismissed']),
  actionTaken: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  const { userId, orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    const data = body.parse(await req.json());

    const [message] = await db
      .select()
      .from(inboxMessages)
      .where(and(eq(inboxMessages.id, id), eq(inboxMessages.orgId, orgId)))
      .limit(1);
    if (!message) return NextResponse.json({ error: 'not found' }, { status: 404 });

    await db.update(inboxMessages).set({
      status: data.status,
      actionTaken: data.actionTaken ?? (data.status === 'handled' ? 'Marked handled' : 'Dismissed'),
      actionTakenAt: new Date(),
      actionTakenBy: userId ?? null,
    }).where(eq(inboxMessages.id, id));

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Bad request' }, { status: 400 });
  }
}
