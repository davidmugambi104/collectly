import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// Verify Paystack webhook signature
function verifySignature(body: string, signature: string | null): boolean {
  if (!PAYSTACK_SECRET || !signature) return false;
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(body)
    .digest('hex');
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-paystack-signature');
  const body = await req.text();

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  try {
    const event = JSON.parse(body);
    const eventType = event.event;
    const data = event.data;

    switch (eventType) {
      case 'charge.success':
        // TODO: update invoice/subscription status in database
        console.log('Payment success:', data.reference, data.amount, data.customer.email);
        break;
      case 'charge.failed':
        console.log('Payment failed:', data.reference, data.status);
        break;
      case 'subscription.create':
      case 'subscription.disable':
        console.log('Subscription event:', eventType, data);
        break;
      default:
        console.log('Unhandled Paystack event:', eventType);
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
