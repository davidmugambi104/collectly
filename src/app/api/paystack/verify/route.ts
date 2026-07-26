import { NextRequest, NextResponse } from 'next/server';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export async function GET(req: NextRequest) {
  if (!PAYSTACK_SECRET) {
    return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY not configured' }, { status: 500 });
  }

  const url = new URL(req.url);
  const reference = url.searchParams.get('reference');

  if (!reference) {
    return NextResponse.json({ error: 'reference is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    if (!data.status) {
      return NextResponse.json({ error: data.message || 'Verification failed' }, { status: 400 });
    }

    // Redirect or return JSON depending on use case
    const status = data.data?.status;
    if (status === 'success') {
      return NextResponse.redirect(new URL('/dashboard/payment/success', req.url));
    }
    return NextResponse.redirect(new URL('/dashboard/payment/failed', req.url));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
