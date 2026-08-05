import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { invoices, disputes, timelineEvents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

// Must match the live `dispute_reason` Postgres enum exactly.
const REASONS = [
  'already_paid', 'need_invoice_copy', 'amount_incorrect', 'awaiting_approval',
  'missing_po', 'payment_plan_request', 'contact_account_manager', 'other',
] as const;

const body = z.object({
  customerId: z.string().min(1),
  invoiceId: z.string().min(1),
  reason: z.enum(REASONS),
  customerMessage: z.string().optional(),
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

    const [dispute] = await db.insert(disputes).values({
      id: nanoid(),
      orgId,
      invoiceId: data.invoiceId,
      customerId: data.customerId,
      reason: data.reason,
      status: 'open',
      customerMessage: data.customerMessage || null,
    }).returning();

    // Disputing a paid/written-off invoice doesn't change its status —
    // otherwise mark it disputed so dunning + the invoice list reflect it.
    if (invoice.status !== 'paid' && invoice.status !== 'written_off') {
      await db.update(invoices).set({ status: 'disputed', updatedAt: new Date() }).where(eq(invoices.id, data.invoiceId));
    }

    await db.insert(timelineEvents).values({
      id: nanoid(),
      orgId,
      customerId: data.customerId,
      invoiceId: data.invoiceId,
      eventType: 'dispute_opened',
      title: `Dispute opened — ${data.reason.replace(/_/g, ' ')}`,
      description: data.customerMessage || null,
    });

    return NextResponse.json({ ok: true, id: dispute.id });
  } catch (e: unknown) {
    // Was unwrapped — a validation failure (body.parse) threw an
    // unhandled ZodError into a bare 500. Same class of bug already
    // fixed on /api/sequences/[id] and /api/interview.
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Bad request' }, { status: 400 });
  }
}
