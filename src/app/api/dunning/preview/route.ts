import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { invoices, customers, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateDunningMessage } from '@/lib/ai/dunning';
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
    const fallback = fallbackMessage({ ...data, customerName: row.customer.name, businessName: row.org.name, invoiceNumber: row.invoice.number });
    return NextResponse.json(fallback);
  }
}

function fallbackMessage(d: { customerName: string; businessName: string; invoiceNumber: string; amount: string; currency: string; daysOverdue: number; tone: 'friendly'|'firm'|'final'; channel: 'email'|'sms' }) {
  const body = d.tone === 'friendly'
    ? `Hi ${d.customerName}, just a quick nudge that invoice ${d.invoiceNumber} for ${d.currency} ${d.amount} was due ${d.daysOverdue} days ago. You can settle it here: https://getcollectly.app/pay/${d.invoiceNumber}. Thanks!\n\n${d.businessName}`
    : d.tone === 'firm'
    ? `Hi ${d.customerName}, invoice ${d.invoiceNumber} for ${d.currency} ${d.amount} is now ${d.daysOverdue} days past due. Please review and settle at your earliest convenience: https://getcollectly.app/pay/${d.invoiceNumber}. Reply with any questions.\n\n${d.businessName}`
    : `Final notice: invoice ${d.invoiceNumber} for ${d.currency} ${d.amount} is ${d.daysOverdue} days overdue. Please reply or settle: https://getcollectly.app/pay/${d.invoiceNumber}. After 60 days this will be referred to collections.\n\n${d.businessName}`;
  return { subject: d.tone === 'friendly' ? `Quick reminder — invoice ${d.invoiceNumber}` : `Invoice ${d.invoiceNumber} — ${d.daysOverdue} days overdue`, body };
}
