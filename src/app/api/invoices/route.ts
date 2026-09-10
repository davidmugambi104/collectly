import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from "@/db";
import { invoices, customers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { recordEvent } from '@/lib/events';

const schema = z.object({
  customerId: z.string(),
  number: z.string().min(1),
  amount: z.string(),
  currency: z.string().default('USD'),
  issueDate: z.string(),
  dueDate: z.string(),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const data = schema.parse(await req.json());

  // SECURITY: customerId comes straight from the request body. Without this
  // check, a caller could pass any org's customer id, and the resulting
  // invoice would join in — and leak — that other org's customer PII
  // (name/email/phone) everywhere invoice detail pages/APIs render the
  // joined customer (invoice detail page, dunning send/preview/test).
  const [ownedCustomer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, data.customerId), eq(customers.orgId, orgId)))
    .limit(1);
  if (!ownedCustomer) {
    return NextResponse.json({ error: 'customer not found' }, { status: 404 });
  }

  const [row] = await db.insert(invoices).values({
    id: nanoid(), orgId, customerId: data.customerId, number: data.number,
    status: 'sent', amount: data.amount, amountPaid: '0', currency: data.currency,
    issueDate: new Date(data.issueDate), dueDate: new Date(data.dueDate),
    description: data.description,
  }).returning();
  // See the matching comment in /api/invoices/mark-paid — 'invoice.created'
  // is a defined EventType nothing was actually recording.
  await recordEvent({ orgId, type: 'invoice.created', payload: { invoiceId: row.id, number: row.number, amount: row.amount, customerId: data.customerId } });
  return NextResponse.json({ ok: true, id: row.id });
}
