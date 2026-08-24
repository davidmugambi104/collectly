import { NextRequest, NextResponse } from 'next/server';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcollectly.app';

// Paystack has no official TS types package -- minimal shape for the
// fields this route actually reads from GET /transaction/verify/:reference.
interface PaystackVerifyResponse {
  status: boolean;
  data?: {
    status?: string;
    metadata?: { invoiceId?: string };
  };
}

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

    const data: PaystackVerifyResponse = await res.json();
    if (!data.status) {
      // Redirect back to the portal with a failure flag. The portal reads
      // ?cancelled=1 and shows a "Payment didn't complete" message — no
      // auth gate, no dead route.
      const invoiceId = data.data?.metadata?.invoiceId;
      const back = invoiceId ? `${APP_URL}/pay/${invoiceId}?cancelled=1` : `${APP_URL}/pay?cancelled=1`;
      return NextResponse.redirect(back);
    }

    // Redirect to the actual payment portal page (unauthenticated), not to
    // /dashboard/payment/* which is auth-gated. Previously this redirected
    // to a route that didn't exist at all.
    const invoiceId = data.data?.metadata?.invoiceId;
    const status = data.data?.status;
    if (status === 'success') {
      const back = invoiceId ? `${APP_URL}/pay/${invoiceId}?paid=1&reference=${encodeURIComponent(reference)}` : `${APP_URL}/pay?paid=1`;
      return NextResponse.redirect(back);
    }
    const back = invoiceId ? `${APP_URL}/pay/${invoiceId}?cancelled=1` : `${APP_URL}/pay?cancelled=1`;
    return NextResponse.redirect(back);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
