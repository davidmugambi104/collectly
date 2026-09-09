import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, getIp } from '@/lib/rate-limit';
import { db } from '@/db';
import { invoices, customers, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * SECURITY: `amount` is deliberately NOT accepted from the caller.
 *
 * This route used to forward the client's `amount` and `metadata` straight to
 * Paystack. Since /pay/[id] is a public page, anyone holding a pay link could
 * initialise a 1-unit charge against a five-figure invoice, and the webhook
 * would then settle it in full. The amount is now derived from the invoice's
 * own outstanding balance, the same way /api/payment/create-checkout does it
 * for Stripe, and `metadata.invoiceId` is written server-side so the webhook
 * can trust what it keys off.
 *
 * `email` stays caller-supplied because it's the payer's receipt address (the
 * portal asks for it) and it carries no authority — it falls back to the
 * customer's stored address when omitted.
 */
const body = z.object({
  invoiceId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  // Accepted for backward compatibility with the existing payment form, which
  // posts { email, amount, metadata: { invoiceId } }. `amount` is ignored.
  metadata: z.object({ invoiceId: z.string().min(1) }).optional(),
});

export async function POST(req: NextRequest) {
  if (!PAYSTACK_SECRET) {
    return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY not configured' }, { status: 500 });
  }

  // Each call creates a real Paystack transaction, so cap it the same way the
  // Stripe checkout route is capped.
  const rl = await rateLimit(getIp(req), { max: 5 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many payment attempts. Please wait a minute and try again.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  let data: z.infer<typeof body>;
  try {
    data = body.parse(await req.json());
  } catch (e: unknown) {
    return NextResponse.json({ error: `invalid request: ${e instanceof Error ? e.message : e}` }, { status: 400 });
  }

  const invoiceId = data.invoiceId ?? data.metadata?.invoiceId;
  if (!invoiceId) {
    return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 });
  }

  const [row] = await db
    .select({ invoice: invoices, customer: customers, org: organizations })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(organizations, eq(organizations.id, invoices.orgId))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!row) return NextResponse.json({ error: 'invoice not found' }, { status: 404 });
  if (row.invoice.status === 'paid') return NextResponse.json({ error: 'already paid' }, { status: 400 });

  const balance = Number(row.invoice.amount) - Number(row.invoice.amountPaid);
  if (!(balance > 0)) return NextResponse.json({ error: 'no balance due' }, { status: 400 });

  const email = data.email ?? row.customer.email;
  if (!email) {
    return NextResponse.json({ error: 'no email address to send the receipt to' }, { status: 400 });
  }

  // Paystack takes the amount in the currency's smallest unit (kobo for NGN,
  // cents for USD/KES/GHS/ZAR).
  const amountMinor = Math.round(balance * 100);
  const currency = (row.invoice.currency ?? 'NGN').toUpperCase();
  const txRef = `collectly-${row.invoice.id}-${Date.now()}`;

  try {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountMinor,
        currency,
        reference: txRef,
        // Written server-side. The webhook keys its DB writes off invoiceId and
        // cross-checks expectedMinor against what Paystack says was charged.
        metadata: {
          invoiceId: row.invoice.id,
          orgId: row.org.id,
          customerId: row.customer.id,
          expectedMinor: amountMinor,
          source: 'collectly-payment-portal',
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/verify?reference=${encodeURIComponent(txRef)}`,
      }),
    });

    const payload = await res.json();
    if (!payload.status) {
      return NextResponse.json({ error: payload.message || 'Paystack initialization failed' }, { status: 400 });
    }

    return NextResponse.json(payload.data);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `payment setup failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 },
    );
  }
}
