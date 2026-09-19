import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, getIp } from '@/lib/rate-limit';
import { db } from '@/db';
import { invoices, customers, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isSquareConnected, squareCreatePaymentLink } from '@/lib/integrations/square';

const body = z.object({ invoiceId: z.string() });

/**
 * Create a Square-hosted payment page for an invoice.
 *
 * The Square sibling of /api/payment/create-checkout. It exists because Stripe
 * Connect requires a platform account in a country Stripe supports, which
 * blocks this product entirely today; Square's OAuth token is treated as
 * acting "by the seller, in the seller's country", so a platform operator
 * outside that list can still create payments for a US or UK business.
 *
 * Money settles into the SELLER's Square balance. Collectly never holds it.
 * That is the whole point — it is the same property that makes the Stripe
 * Connect path safe, and the absence of it is why Paystack is disabled.
 *
 * `amount` is never taken from the caller. It is derived from the invoice, for
 * the same reason the Stripe route derives it: a client-supplied amount lets
 * anyone mark a large invoice paid by sending a small number.
 */
export async function POST(req: NextRequest) {
  // Each call creates a real Square payment link, so the same 5/min cap as the
  // Stripe route applies — this is a spam vector against the seller's account,
  // not just ours.
  const rl = await rateLimit(getIp(req), { max: 5, key: 'square-checkout' });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please wait a minute and try again.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  let data: z.infer<typeof body>;
  try {
    data = body.parse(await req.json());
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `invalid request: ${e instanceof Error ? e.message : e}` },
      { status: 400 },
    );
  }

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

  if (!(await isSquareConnected(row.org.id))) {
    return NextResponse.json(
      {
        error: `${row.org.name} hasn't finished setting up online payments yet. Try Wire transfer, or contact them directly.`,
      },
      { status: 400 },
    );
  }

  const origin =
    req.headers.get('origin') ??
    req.headers.get('x-forwarded-origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3030';

  try {
    // `paid=1` is the same convention the Stripe flow uses, and the pay page
    // already treats it as "the provider redirected back", NOT as proof the
    // invoice is settled — it re-reads the row before showing a receipt.
    const { url } = await squareCreatePaymentLink(row.org.id, {
      invoiceId: row.invoice.id,
      invoiceNumber: row.invoice.number,
      amount: balance,
      currency: row.invoice.currency ?? 'USD',
      sellerName: row.org.name,
      buyerEmail: row.customer.email,
      redirectUrl: `${origin}/pay/${row.invoice.id}?paid=1`,
    });
    return NextResponse.json({ url });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[square-checkout]', message);
    return NextResponse.json(
      { error: 'Could not start a Square payment. Try another method or contact the business.' },
      { status: 502 },
    );
  }
}
