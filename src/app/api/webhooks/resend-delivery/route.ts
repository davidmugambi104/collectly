import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dunningRuns, invoices, customers } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { planDeliveryEvent, verifyDeliveryWebhook, type DeliveryEvent } from '@/lib/dunning/delivery-events';

/**
 * Resend delivery-status webhook: email.delivered / email.opened /
 * email.clicked / email.bounced / email.complained. Updates
 * dunningRuns.status so /dashboard/dunning and
 * /dashboard/dunning/performance (which both already check for
 * status === 'delivered') show real data instead of every run sitting
 * at 'sent' forever.
 *
 * Matches on data.message_id — confirmed present on Resend's delivery
 * webhook payloads (their own example: {"data": {"email_id": "...",
 * "message_id": "<111-222-333@email.example.com>", ...}}) — against the
 * same value captured at send time via fetchResendMessageId
 * (src/lib/infra.ts) into dunningRuns.externalMessageId.
 */

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_DELIVERY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'missing RESEND_DELIVERY_WEBHOOK_SECRET' }, { status: 500 });
  }

  const rawBody = await req.text();
  let event: DeliveryEvent;
  try {
    event = verifyDeliveryWebhook(secret, rawBody, req.headers);
  } catch (e: unknown) {
    return NextResponse.json({ error: `signature verification failed: ${e instanceof Error ? e.message : e}` }, { status: 400 });
  }

  const type = String(event?.type || '');
  const messageId = event?.data?.message_id ? String(event.data.message_id) : null;

  if (!messageId) {
    return NextResponse.json({ received: true, ignored: 'no message_id on payload' });
  }

  const [run] = await db.select().from(dunningRuns).where(eq(dunningRuns.externalMessageId, messageId)).limit(1);
  if (!run) {
    // Not a dunning send we're tracking (could be an outreach/manual
    // send, or a webhook for an email sent before this feature existed).
    return NextResponse.json({ received: true, matched: false });
  }

  try {
    const plan = planDeliveryEvent(run.status, event);
    if (plan.setStatus === 'failed') {
      await db.update(dunningRuns).set({ status: 'failed', error: plan.error ?? null }).where(eq(dunningRuns.id, run.id));
    } else if (plan.setStatus) {
      await db.update(dunningRuns).set({ status: plan.setStatus }).where(eq(dunningRuns.id, run.id));
    }
    if (plan.suppressCustomer) {
      // A hard bounce or spam complaint is a real reputation risk. Stop future
      // sends to this customer with the same do-not-disturb switch as an
      // unsubscribe. Keep the first timestamp if it is already set.
      const [inv] = await db.select({ customerId: invoices.customerId }).from(invoices).where(eq(invoices.id, run.invoiceId)).limit(1);
      if (inv) {
        const now = new Date();
        await db.update(customers).set({ dndAt: now, updatedAt: now }).where(and(eq(customers.id, inv.customerId), isNull(customers.dndAt)));
      }
    }
    return NextResponse.json({ received: true, matched: true, runId: run.id, type, action: plan.reason });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[resend-delivery] failed to update run:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
