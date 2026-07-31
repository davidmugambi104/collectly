import { NextRequest, NextResponse } from 'next/server';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export async function POST(req: NextRequest) {
  if (!PAYSTACK_SECRET) {
    return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { email, amount, reference, metadata } = body;

    if (!email || !amount) {
      return NextResponse.json({ error: 'email and amount are required' }, { status: 400 });
    }

    // The Paystack webhook (src/app/api/paystack/webhook/route.ts) keys DB
    // writes off metadata.invoiceId — without it the charge is logged but
    // never applied to the invoice. Refuse early rather than silently
    // producing a transaction the system can't reconcile.
    if (!metadata?.invoiceId) {
      return NextResponse.json({ error: 'metadata.invoiceId is required' }, { status: 400 });
    }

    const txRef = reference || `collectly-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const payload = {
      email,
      amount, // in smallest currency unit (kobo for KES, cents for USD)
      reference: txRef,
      metadata: metadata ?? {},
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
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
