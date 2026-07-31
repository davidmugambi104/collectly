import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { invoices, customers, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateDunningMessage, fallbackDunningMessage } from '@/lib/ai/dunning';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const body = z.object({
  invoiceId: z.string(),
  amount: z.string(),
  currency: z.string().default('USD'),
  daysOverdue: z.number().int().min(0),
  channel: z.enum(['email', 'sms']),
  tone: z.enum(['friendly', 'firm', 'final']),
});

export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const data = body.parse(await req.json());

  const [row] = await db
    .select({ invoice: invoices, customer: customers, org: organizations })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(organizations, eq(organizations.id, invoices.orgId))
    .where(eq(invoices.id, data.invoiceId))
    .limit(1);

  if (!row || row.invoice.orgId !== orgId) return NextResponse.json({ error: 'not found' }, { status: 404 });

  try {
    const result = await generateDunningMessage({
      invoiceId: row.invoice.id,
      businessName: row.org.name,
      contactName: row.customer.name,
      invoiceNumber: row.invoice.number,
      amount: data.amount,
      currency: data.currency,
      dueDate: row.invoice.dueDate.toISOString().slice(0, 10),
      daysOverdue: data.daysOverdue,
      tone: data.tone,
      channel: data.channel,
      priorMessages: 0,
      customerPaymentHistory: {
        avgDaysToPay: row.customer.paymentBehavior?.avgDaysToPay ?? 30,
        paidRate: row.customer.paymentBehavior?.paidRate ?? 1,
      },
    });
    return NextResponse.json(result);
  } catch (e: any) {
    // Use the canonical fallback (which now correctly builds the payment
    // URL from invoice.id) instead of a private duplicate that had the
    // old invoiceNumber-based bug.
    const fallback = fallbackDunningMessage({
      invoiceId: row.invoice.id,
      businessName: row.org.name,
      contactName: row.customer.name,
      invoiceNumber: row.invoice.number,
      amount: data.amount,
      currency: data.currency,
      dueDate: row.invoice.dueDate.toISOString().slice(0, 10),
      daysOverdue: data.daysOverdue,
      tone: data.tone,
      channel: data.channel,
      priorMessages: 0,
      customerPaymentHistory: {
        avgDaysToPay: row.customer.paymentBehavior?.avgDaysToPay ?? 30,
        paidRate: row.customer.paymentBehavior?.paidRate ?? 1,
      },
    });
    return NextResponse.json(fallback);
  }
}
