import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimit, getIp } from '@/lib/rate-limit';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// Disabled platform-wide (2026-08-05): this route charges through
// Collectly's own single PAYSTACK_SECRET_KEY with no per-agency subaccount
// or split_code — money paid here settles into Collectly's account, not
// the business being paid, and nothing anywhere transfers it onward. Same
// class of bug as the one fixed in /api/payment/create-checkout, except
// no per-org connect flow exists yet to fix it properly. Gated at the API
// level (not just hidden in the UI) so a direct POST can't route around
// the frontend gate in src/components/payment/payment-form.tsx.
const PAYSTACK_ENABLED = false;

export async function POST(req: NextRequest) {
  if (!PAYSTACK_ENABLED) {
    return NextResponse.json(
      { error: 'Card/bank/mobile-money payment via Paystack is temporarily unavailable. Please use wire transfer, or contact the business directly.' },
      { status: 503 },
    );
  }
  if (!PAYSTACK_SECRET) {
    return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY not configured' }, { status: 500 });
  }

  // Mirrors /api/payment/create-checkout's rate limit — each call creates
  // a real Paystack transaction.
  const rl = await rateLimit(getIp(req), { max: 5, key: 'paystack-initialize' });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many payment attempts. Please wait a minute and try again.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const bodyJson = await req.json();
    const { email, reference, metadata } = bodyJson;
    const invoiceId = metadata?.invoiceId;

    if (!email || !invoiceId) {
      return NextResponse.json({ error: 'email and metadata.invoiceId are required' }, { status: 400 });
    }

    // SECURITY: the caller used to supply `amount` directly and it was
    // sent to Paystack as-is — anyone who could see an invoice's id (the
    // payment portal URL) could POST any amount, including $0.01, then
    // the webhook marked the full invoice "paid" once that charge
    // succeeded (see the matching fix in webhook/route.ts). The real
    // amount now always comes from the invoice's own remaining balance,
    // computed here, never from the request body — same pattern as
    // /api/payment/create-checkout.
    const [row] = await db.select().from(invoices).where(eq(invoices.id, String(invoiceId))).limit(1);
    if (!row) return NextResponse.json({ error: 'invoice not found' }, { status: 404 });
    if (row.status === 'paid') return NextResponse.json({ error: 'already paid' }, { status: 400 });
    const balance = Number(row.amount) - Number(row.amountPaid);
    if (balance <= 0) return NextResponse.json({ error: 'no balance due' }, { status: 400 });
    const amount = Math.round(balance * 100); // Paystack expects the smallest currency unit

    const txRef = reference || `collectly-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const payload = {
      email,
      amount,
      reference: txRef,
      metadata: { invoiceId: row.id },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/verify?reference=${txRef}`,
    };

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.status) {
      return NextResponse.json({ error: data.message || 'Paystack initialization failed' }, { status: 400 });
    }

    return NextResponse.json(data.data);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
