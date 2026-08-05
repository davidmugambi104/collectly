import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { invoices, promisesToPay, timelineEvents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid, formatCurrency, formatDate } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const body = z.object({
  customerId: z.string().min(1),
  invoiceId: z.string().min(1),
  promisedAmount: z.coerce.number().positive(),
  promisedDate: z.string().min(1),
  sourceText: z.string().optional(),
});

export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const data = body.parse(await req.json());

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, data.invoiceId), eq(invoices.orgId, orgId), eq(invoices.customerId, data.customerId)))
      .limit(1);
    if (!invoice) return NextResponse.json({ error: 'invoice not found' }, { status: 404 });

    const promisedDate = new Date(data.promisedDate);
    if (Number.isNaN(promisedDate.getTime())) {
      return NextResponse.json({ error: 'invalid promisedDate' }, { status: 400 });
    }

    const [promise] = await db.insert(promisesToPay).values({
      id: nanoid(),
      orgId,
      invoiceId: data.invoiceId,
      customerId: data.customerId,
      promisedDate,
      promisedAmount: data.promisedAmount.toFixed(2),
      currency: invoice.currency,
      status: 'active',
      sourceText: data.sourceText || null,
    }).returning();

    await db.insert(timelineEvents).values({
      id: nanoid(),
      orgId,
      customerId: data.customerId,
      invoiceId: data.invoiceId,
      eventType: 'promise_made',
      title: `Promised ${formatCurrency(data.promisedAmount, invoice.currency)} by ${formatDate(promisedDate)}`,
      description: data.sourceText || null,
    });

    return NextResponse.json({ ok: true, id: promise.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Bad request' }, { status: 400 });
  }
}
