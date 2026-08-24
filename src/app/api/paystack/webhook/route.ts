import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db';
import { invoices, payments, customers } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// Paystack has no official TS types package -- minimal shape for the
// fields this handler actually reads across the event types it handles.
interface PaystackEvent {
  event?: string;
  data?: {
    id?: number | string;
    amount?: number;
    currency?: string;
    channel?: string;
    reference?: string;
    status?: string;
    subscription_code?: string;
    metadata?: { invoiceId?: string };
    customer?: { email?: string };
  };
}

function verifySignature(body: string, signature: string | null): boolean {
  if (!PAYSTACK_SECRET || !signature) return false;
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(body)
    .digest('hex');
  return hash === signature;
}

/**
 * Paystack webhook handler.
 *
 * Until 2026-07-31 this route only logged events, so paid invoices never
 * moved from `sent`/`overdue` to `paid` automatically. P1.5 audit fix:
 * when a `charge.success` event carries `metadata.invoiceId`, we look up
 * the invoice, insert a `payments` row keyed by Paystack's `data.id`, and
 * mark the invoice paid. Idempotent — the unique partial index
 * `payments_paystack_charge_uniq` rejects duplicate charge ids.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-paystack-signature');
  const body = await req.text();

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const eventType = event?.event;
  const data = event?.data ?? {};

  if (eventType === 'charge.success') {
    try {
      const invoiceId = data?.metadata?.invoiceId;
      const chargeId = data?.id ? String(data.id) : null;
      const amountKobo = Number(data?.amount ?? 0);
      const amountMajor = amountKobo > 0 ? amountKobo / 100 : 0;
      const currency = String(data?.currency ?? 'NGN').toUpperCase();
      const email = data?.customer?.email ? String(data.customer.email) : null;

      if (!invoiceId) {
        console.log('[paystack] charge.success without metadata.invoiceId; skipping DB write. ref=', data?.reference);
        return NextResponse.json({ received: true, action: 'logged' });
      }
      if (!chargeId) {
        console.log('[paystack] charge.success missing data.id; skipping DB write.');
        return NextResponse.json({ received: true, action: 'logged' });
      }

      // Look up invoice + customer in one go
      const [row] = await db
        .select({ invoice: invoices, customer: customers })
        .from(invoices)
        .innerJoin(customers, eq(customers.id, invoices.customerId))
        .where(eq(invoices.id, String(invoiceId)))
        .limit(1);

      if (!row) {
        console.log('[paystack] invoice not found for metadata.invoiceId=', invoiceId);
        return NextResponse.json({ received: true, action: 'logged' });
      }

      // Insert payment (idempotent via unique partial index on external_id)
      let paymentInserted = false;
      try {
        await db.insert(payments).values({
          id: nanoid(),
          orgId: row.invoice.orgId,
          invoiceId: row.invoice.id,
          customerId: row.customer.id,
          amount: String(amountMajor || row.invoice.amount),
          currency,
          method: data?.channel ?? 'card',
          reference: data?.reference ? String(data.reference) : null,
          externalId: chargeId,
          paidAt: new Date(),
        });
        paymentInserted = true;
      } catch (e: unknown) {
        // Unique violation => duplicate delivery; ignore, still flip invoice if not already paid
        const message = e instanceof Error ? e.message : String(e);
        if (!message.includes('payments_paystack_charge_uniq')) {
          throw e;
        }
      }

      // Mark invoice paid (idempotent: only flips non-paid invoices)
      const updated = await db
        .update(invoices)
        .set({
          status: 'paid',
          amountPaid: String(row.invoice.amount),
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.id, row.invoice.id), sql`${invoices.status} <> 'paid'`))
        .returning({ id: invoices.id });

      console.log('[paystack] charge.success applied. invoice=', row.invoice.id, 'paymentInserted=', paymentInserted, 'flippedInvoice=', updated.length > 0, 'email=', email);
      return NextResponse.json({ received: true, action: 'applied' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('[paystack] charge.success failed:', message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (eventType === 'charge.failed') {
    console.log('Payment failed:', data?.reference, data?.status);
    return NextResponse.json({ received: true });
  }

  if (eventType === 'subscription.create' || eventType === 'subscription.disable') {
    console.log('Subscription event:', eventType, data?.reference ?? data?.subscription_code);
    return NextResponse.json({ received: true });
  }

  console.log('Unhandled Paystack event:', eventType);
  return NextResponse.json({ received: true });
}