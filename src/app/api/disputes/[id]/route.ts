import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { disputes, invoices, timelineEvents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const body = z.object({
  internalNotes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = body.parse(await req.json());

  const [dispute] = await db
    .select()
    .from(disputes)
    .where(and(eq(disputes.id, id), eq(disputes.orgId, orgId)))
    .limit(1);
  if (!dispute) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await db.update(disputes).set({
    status: 'resolved',
    internalNotes: data.internalNotes || dispute.internalNotes,
    resolvedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(disputes.id, id));

  // Recompute the invoice's status now that the dispute is closed, same
  // logic the QBO/Xero sync uses: paid > partial > overdue > sent.
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, dispute.invoiceId)).limit(1);
  if (invoice && invoice.status === 'disputed') {
    const amount = parseFloat(invoice.amount.toString());
    const paid = parseFloat(invoice.amountPaid?.toString() || '0');
    const nextStatus =
      paid >= amount ? 'paid' :
      paid > 0 ? 'partial' :
      new Date(invoice.dueDate) < new Date() ? 'overdue' : 'sent';
    await db.update(invoices).set({ status: nextStatus, updatedAt: new Date() }).where(eq(invoices.id, invoice.id));
  }

  await db.insert(timelineEvents).values({
    id: nanoid(),
    orgId,
    customerId: dispute.customerId,
    invoiceId: dispute.invoiceId,
    eventType: 'dispute_resolved',
    title: 'Dispute resolved',
    description: data.internalNotes || null,
  });

  return NextResponse.json({ ok: true });
}
