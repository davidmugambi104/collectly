import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { invoices, customers, organizations } from '@/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { generateDunningMessage, fallbackDunningMessage } from '@/lib/ai/dunning';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { daysOverdue } from '@/lib/utils';

const body = z.object({
  invoiceId: z.string().optional(),
  channel: z.enum(['email', 'sms']),
  tone: z.enum(['friendly', 'firm', 'final']),
  brandVoice: z.string().max(2000).optional(),
});

// Used only when the org has zero overdue invoices yet (e.g. before their
// first Xero/QuickBooks sync) -- the sequence editor still needs to show
// what the AI would write. Response is flagged `sample: true` so the UI
// can label it honestly instead of presenting it as this org's real data.
const SAMPLE_CONTEXT = {
  invoiceId: 'sample-invoice',
  businessName: 'Your business',
  contactName: 'Sample Customer',
  invoiceNumber: 'INV-1001',
  amount: '4200.00',
  currency: 'USD',
  daysOverdue: 21,
  priorMessages: 0,
  customerPaymentHistory: { avgDaysToPay: 32, paidRate: 0.9 },
};

export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const data = body.parse(await req.json());

  let row: { invoice: typeof invoices.$inferSelect; customer: typeof customers.$inferSelect; org: typeof organizations.$inferSelect } | undefined;

  if (data.invoiceId) {
    // Specific invoice requested (e.g. from the per-invoice composer) --
    // ownership is verified below, same as before.
    [row] = await db
      .select({ invoice: invoices, customer: customers, org: organizations })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .innerJoin(organizations, eq(organizations.id, invoices.orgId))
      .where(eq(invoices.id, data.invoiceId))
      .limit(1);
    if (!row || row.invoice.orgId !== orgId) return NextResponse.json({ error: 'not found' }, { status: 404 });
  } else {
    // Sequence-editor preview: no specific invoice in mind, so auto-fetch
    // this org's own most-overdue real invoice ("the info", per the
    // product ask) rather than requiring the caller to already know one.
    [row] = await db
      .select({ invoice: invoices, customer: customers, org: organizations })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .innerJoin(organizations, eq(organizations.id, invoices.orgId))
      .where(and(eq(invoices.orgId, orgId), sql`${invoices.status} NOT IN ('paid', 'written_off')`))
      .orderBy(desc(invoices.dueDate))
      .limit(1);
  }

  const ctx = row
    ? {
        invoiceId: row.invoice.id,
        businessName: row.org.name,
        contactName: row.customer.name,
        invoiceNumber: row.invoice.number,
        amount: (parseFloat(row.invoice.amount.toString()) - parseFloat((row.invoice.amountPaid ?? 0).toString())).toFixed(2),
        currency: row.invoice.currency ?? 'USD',
        dueDate: row.invoice.dueDate.toISOString().slice(0, 10),
        daysOverdue: Math.max(0, daysOverdue(row.invoice.dueDate)),
        priorMessages: 0,
        customerPaymentHistory: {
          avgDaysToPay: row.customer.paymentBehavior?.avgDaysToPay ?? 30,
          paidRate: row.customer.paymentBehavior?.paidRate ?? 1,
        },
      }
    : { ...SAMPLE_CONTEXT, dueDate: new Date(Date.now() - SAMPLE_CONTEXT.daysOverdue * 86400000).toISOString().slice(0, 10) };

  const fullCtx = { ...ctx, tone: data.tone, channel: data.channel, brandVoice: data.brandVoice || undefined };

  // Surfaced in the UI so no one previews or approves a message referencing
  // a real customer's real balance without seeing exactly who it's for and
  // where it would go -- the "who is this actually being sent to" gap.
  const recipient = row
    ? {
        name: row.customer.name,
        email: row.customer.email ?? null,
        phone: row.customer.phone ?? null,
        invoiceNumber: row.invoice.number,
      }
    : null;

  try {
    const result = await generateDunningMessage(fullCtx);
    return NextResponse.json({ ...result, sample: !row, recipient });
  } catch (e: any) {
    // generateDunningMessage() already falls back internally on Gemini
    // failure -- this catch is defense-in-depth for anything else (e.g.
    // a malformed context) so the preview never hard-errors in the UI.
    const fallback = fallbackDunningMessage(fullCtx);
    return NextResponse.json({ ...fallback, sample: !row, recipient });
  }
}
