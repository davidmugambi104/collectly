import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { invoices, timelineEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const schema = z.object({ invoiceId: z.string(), reason: z.string().max(500).optional() });

// invoice_status already has 'written_off', and every collections query
// (dunning scheduler, analytics, customer detail page) already excludes
// it as a terminal state — but until this route existed there was no way
// to actually set it, only 'paid'. Bad debt you've given up collecting
// on had no path except leaving it stuck as 'overdue' forever.
export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { invoiceId, reason } = schema.parse(await req.json());
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv || inv.orgId !== orgId) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (inv.status === 'paid') return NextResponse.json({ error: 'invoice is already paid' }, { status: 400 });

  await db.update(invoices).set({ status: 'written_off', updatedAt: new Date() }).where(eq(invoices.id, invoiceId));

  await db.insert(timelineEvents).values({
    id: nanoid(),
    orgId,
    customerId: inv.customerId,
    invoiceId,
    eventType: 'note_added',
    title: 'Invoice written off',
    description: reason || null,
  });

  return NextResponse.json({ ok: true });
}
