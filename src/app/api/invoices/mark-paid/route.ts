import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from "@/db";
import { invoices, payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const schema = z.object({ invoiceId: z.string() });

export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { invoiceId } = schema.parse(await req.json());
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv || inv.orgId !== orgId) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const balance = Number(inv.amount) - Number(inv.amountPaid);
  const now = new Date();
  await db.insert(payments).values({
    id: nanoid(), orgId, invoiceId, customerId: inv.customerId,
    amount: String(balance), currency: inv.currency, method: 'manual', paidAt: now,
  });
  await db.update(invoices).set({ status: 'paid', amountPaid: String(inv.amount), paidAt: now, updatedAt: now }).where(eq(invoices.id, invoiceId));
  return NextResponse.json({ ok: true });
}
