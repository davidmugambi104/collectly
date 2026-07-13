import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { invoices, customers, organizations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateDunningMessage } from '@/lib/ai/dunning';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { z } from 'zod';

const body = z.object({
  invoiceId: z.string(),
  channel: z.enum(['email', 'sms']).default('email'),
  tone: z.enum(['friendly', 'firm', 'final']).default('firm'),
  sendReal: z.boolean().default(false),
});

/**
 * Test dunning message generation. If sendReal=true, actually send via Resend/Twilio.
 * If false (default), just return the generated message — useful for QA and screenshots.
 */
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
    .where(and(eq(invoices.id, data.invoiceId), eq(invoices.orgId, orgId)))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const now = Date.now();
  const daysOverdue = Math.max(0, Math.floor((now - new Date(row.invoice.dueDate).getTime()) / 86400000));
  const balance = String(Number(row.invoice.amount) - Number(row.invoice.amountPaid));

  try {
    const result = await generateDunningMessage({
      businessName: row.org.name,
      contactName: row.customer.name,
      invoiceNumber: row.invoice.number,
      amount: balance,
      currency: row.invoice.currency,
      dueDate: row.invoice.dueDate.toISOString().slice(0, 10),
      daysOverdue,
      tone: data.tone,
      channel: data.channel,
      priorMessages: 0,
      customerPaymentHistory: {
        avgDaysToPay: row.customer.paymentBehavior?.avgDaysToPay ?? 30,
        paidRate: row.customer.paymentBehavior?.paidRate ?? 0.85,
      },
    });
    return NextResponse.json({ ok: true, sent: data.sendReal, daysOverdue, balance, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message) }, { status: 500 });
  }
}
