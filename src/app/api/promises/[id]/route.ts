import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { promisesToPay, timelineEvents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid, formatCurrency, formatDate } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const body = z.object({
  status: z.enum(['fulfilled', 'broken']),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = body.parse(await req.json());

  const [promise] = await db
    .select()
    .from(promisesToPay)
    .where(and(eq(promisesToPay.id, id), eq(promisesToPay.orgId, orgId)))
    .limit(1);
  if (!promise) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await db.update(promisesToPay).set({ status: data.status, updatedAt: new Date() }).where(eq(promisesToPay.id, id));

  await db.insert(timelineEvents).values({
    id: nanoid(),
    orgId,
    customerId: promise.customerId,
    invoiceId: promise.invoiceId,
    eventType: data.status === 'fulfilled' ? 'promise_fulfilled' : 'promise_broken',
    title: data.status === 'fulfilled'
      ? `Promise fulfilled — ${formatCurrency(promise.promisedAmount, promise.currency ?? 'USD')}`
      : `Promise broken — ${formatCurrency(promise.promisedAmount, promise.currency ?? 'USD')} was due ${formatDate(promise.promisedDate)}`,
  });

  return NextResponse.json({ ok: true });
}
