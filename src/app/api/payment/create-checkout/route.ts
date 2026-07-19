import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/infra';
import { rateLimit, getIp } from '@/lib/rate-limit';
import { db } from '@/db';
import { invoices, customers, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

const body = z.object({
  invoiceId: z.string(),
  method: z.enum(['card', 'ach']).default('card'),
});

/**
 * Create a Stripe Checkout Session for a customer to pay an invoice.
 * The customer is redirected to Stripe's hosted page; on success,
 * /api/webhooks/stripe is called and the invoice is marked paid.
 */
export async function POST(req: NextRequest) {
  // Rate-limit checkout creation: each call creates a real Stripe Session,
  // so cap at 5/min per IP. Returning 429 cheaply stops the spam vector
  // where an attacker burns our Stripe quota.
  const rl = rateLimit(getIp(req), { max: 5 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please wait a minute and try again.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  let data: z.infer<typeof body>;
  try {
    data = body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: `invalid request: ${e.message}` }, { status: 400 });
  }

  // Load the invoice, customer, and org
  const [row] = await db
    .select({ invoice: invoices, customer: customers, org: organizations })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(organizations, eq(organizations.id, invoices.orgId))
    .where(eq(invoices.id, data.invoiceId))
    .limit(1);

  if (!row) return NextResponse.json({ error: 'invoice not found' }, { status: 404 });
  if (row.invoice.status === 'paid') return NextResponse.json({ error: 'already paid' }, { status: 400 });

  const balance = Number(row.invoice.amount) - Number(row.invoice.amountPaid);
  if (balance <= 0) return NextResponse.json({ error: 'no balance due' }, { status: 400 });

  // Resolve the public origin so the success/cancel URLs work both locally and in prod
  const origin =
    req.headers.get('origin') ??
    req.headers.get('x-forwarded-origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3030';

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: data.method === 'ach' ? (['us_bank_transfer'] as any) : ['card'],
      customer_email: row.customer.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: (row.invoice.currency ?? 'usd').toLowerCase(),
            product_data: {
              name: `Invoice ${row.invoice.number} — ${row.org.name}`,
            },
            unit_amount: Math.round(balance * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId: row.invoice.id,
        orgId: row.org.id,
        customerId: row.customer.id,
        source: 'collectly-payment-portal',
      },
      payment_intent_data: {
        metadata: {
          invoiceId: row.invoice.id,
          orgId: row.org.id,
          customerId: row.customer.id,
        },
      },
      success_url: `${origin}/pay/${row.invoice.id}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pay/${row.invoice.id}?cancelled=1`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e: any) {
    return NextResponse.json({ error: `payment setup failed: ${e.message ?? e}` }, { status: 500 });
  }
}
