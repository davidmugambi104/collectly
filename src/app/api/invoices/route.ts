import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db, schema } from '@/db/client';
import { invoices } from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';

const schema_ = z.object({
  customerId: z.string(),
  number: z.string().min(1),
  amount: z.string(),
  currency: z.string().default('USD'),
  issueDate: z.string(),
  dueDate: z.string(),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const data = schema_.parse(await req.json());
  const [row] = await db.insert(invoices).values({
    id: nanoid(), orgId, customerId: data.customerId, number: data.number,
    status: 'sent', amount: data.amount, amountPaid: '0', currency: data.currency,
    issueDate: new Date(data.issueDate), dueDate: new Date(data.dueDate),
    description: data.description,
  }).returning();
  return NextResponse.json({ ok: true, id: row.id });
}
