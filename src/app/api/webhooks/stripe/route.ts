import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/infra';
import { handleStripeEvent } from '@/lib/billing';
import { pool } from '@/db';

/**
 * Idempotency guard keyed on Stripe's own event id — Stripe explicitly
 * documents at-least-once delivery (redelivery isn't only an
 * error-retry thing, it happens in normal operation). Without this,
 * handleStripeEvent()'s dispute-created branch inserted a fresh
 * `disputes` row and sent a fresh "chargeback opened" email on every
 * redelivery, and its refund-reversal branch re-applied the same refund
 * against amountPaid every time — same idempotency gap already fixed for
 * the outreach-inbound webhook (src/lib/outreach-inbound.ts), same
 * self-creating-table approach for the same reason: no reliable way to
 * run a migration against production from outside the running app.
 */
async function alreadySeenStripeEvent(eventId: string): Promise<boolean> {
  const client = await pool().connect();
  try {
    const [row] = (await client.query(`SELECT 1 FROM webhook_events_seen WHERE svix_id = $1`, [eventId]).catch((e: unknown) => {
      const code = (e as { code?: string })?.code;
      if (code !== '42P01') throw e; // 42P01 = undefined_table — nothing recorded yet either way
      return { rows: [] };
    })).rows;
    return !!row;
  } finally {
    client.release();
  }
}

// Marks an event processed only after handleStripeEvent() returns
// successfully — never before. Marking first would mean a genuine
// failure (a real DB hiccup, a Stripe API error) gets recorded as
// "handled" and Stripe's legitimate retry of that same event is then
// silently skipped forever, turning a transient failure into permanent
// data loss instead of the harmless no-op this guard is meant to be.
async function markStripeEventProcessed(eventId: string): Promise<void> {
  const client = await pool().connect();
  try {
    const insert = () => client.query(`INSERT INTO webhook_events_seen (svix_id) VALUES ($1) ON CONFLICT DO NOTHING`, [eventId]);
    try {
      await insert();
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code !== '42P01') throw e;
      await client.query(`CREATE TABLE IF NOT EXISTS webhook_events_seen (svix_id TEXT PRIMARY KEY, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
      await insert();
    }
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (e: any) {
    return NextResponse.json({ error: `webhook signature failed: ${e.message}` }, { status: 400 });
  }
  try {
    if (await alreadySeenStripeEvent(event.id)) {
      return NextResponse.json({ received: true, deduped: true });
    }
    await handleStripeEvent(event);
    await markStripeEventProcessed(event.id);
    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? e }, { status: 500 });
  }
}
