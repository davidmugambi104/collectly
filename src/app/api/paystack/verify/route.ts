import { NextRequest, NextResponse } from 'next/server';

// Kept in step with /api/paystack/initialize, which is gated the same way.
// Verify is the other half of that flow: if a charge can never be initialised,
// there is nothing legitimate to verify, and leaving this half open meant the
// disabled feature still had a live, unauthenticated endpoint.
const PAYSTACK_ENABLED = false;

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mugavi.com';

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
  if (!PAYSTACK_ENABLED || !PAYSTACK_SECRET) {
    // 503, not 500. This is a deliberately disabled feature, not a fault: a 500
    // says the server broke and pollutes error monitoring with a permanent
    // false alarm. The message no longer names the missing variable either --
    // this endpoint is public, and which secrets are unset is not something an
    // anonymous caller needs told.
    return NextResponse.json(
      { error: 'Paystack payments are not available.' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }

  const url = new URL(req.url);
  const reference = url.searchParams.get('reference');

  if (!reference) {
    return NextResponse.json({ error: 'reference is required' }, { status: 400 });
  }

  // SECURITY: `reference` lands in the *path* of a Paystack API call that
  // carries our secret key. Unencoded, a value like `../../customer` would
  // traverse to a different Paystack endpoint and return data this route was
  // never meant to expose. Paystack references are alphanumeric plus
  // `-` `_` `.`, so reject anything else outright and encode what's left.
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(reference)) {
    return NextResponse.json({ error: 'invalid reference' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
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
