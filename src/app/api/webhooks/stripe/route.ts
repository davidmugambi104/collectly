import { NextRequest, NextResponse } from 'next/server';
import { handleStripeEvent } from '@/lib/billing';
import { processStripeWebhook } from '@/lib/stripe-webhook';
import { dbSubStore, pgEventStore } from '@/lib/stripe-webhook-db';

/**
 * One endpoint for two jobs. Mugavi's own subscription events (checkout.session.completed
 * for a plan, customer.subscription.updated/deleted, invoice.paid, invoice.payment_failed)
 * are handled in lib/stripe-webhook.ts: signature checked first, each event id processed once,
 * and rows billed by hand are never touched. Everything else (customer invoice payments,
 * refunds, disputes) goes to handleStripeEvent in lib/billing.ts, behind the same guards.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const result = await processStripeWebhook({
    rawBody: body,
    signature: req.headers.get('stripe-signature'),
    secret: process.env.STRIPE_WEBHOOK_SECRET,
    events: pgEventStore,
    subs: dbSubStore,
    env: process.env,
    handleOther: handleStripeEvent,
  });
  return NextResponse.json(result.body, { status: result.status });
}
