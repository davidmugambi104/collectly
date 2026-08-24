import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { db } from '@/db';
import { dunningRuns, invoices, customers, dunningStatus } from '@/db/schema';
import { eq } from 'drizzle-orm';

type DunningRunStatus = (typeof dunningStatus.enumValues)[number];

// Resend's delivery-webhook payload shape (the fields this handler
// actually reads). svix's Webhook.verify() intentionally returns
// `unknown` -- this is the one documented assertion at the trust
// boundary, matching the pattern in src/lib/outreach-inbound.ts.
interface ResendDeliveryEvent {
  type?: string;
  data?: {
    message_id?: string;
    bounce?: { message?: string };
  };
}

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

// Ordinal funnel position so an out-of-order/retried webhook (Resend
// retries for ~24h) can never regress a run backward, e.g. a late
// 'delivered' arriving after 'opened' was already recorded.
const STATUS_RANK: Record<string, number> = {
  scheduled: 0,
  sent: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
};

const EVENT_TO_STATUS: Record<string, DunningRunStatus> = {
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
};

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_DELIVERY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'missing RESEND_DELIVERY_WEBHOOK_SECRET' }, { status: 500 });
  }

  const rawBody = await req.text();
  const wh = new Webhook(secret);
  let event: ResendDeliveryEvent;
  try {
    event = wh.verify(rawBody, {
      'svix-id': req.headers.get('svix-id') || '',
      'svix-timestamp': req.headers.get('svix-timestamp') || '',
      'svix-signature': req.headers.get('svix-signature') || '',
    }) as ResendDeliveryEvent;
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
    if (type === 'email.bounced') {
      await db.update(dunningRuns).set({
        status: 'failed',
        error: `bounced: ${event?.data?.bounce?.message ?? 'hard bounce'}`,
      }).where(eq(dunningRuns.id, run.id));
    } else if (type === 'email.complained') {
      await db.update(dunningRuns).set({ status: 'failed', error: 'recipient marked as spam' }).where(eq(dunningRuns.id, run.id));
      // A spam complaint is a real deliverability/reputation risk — stop
      // future dunning sends to this customer, same mechanism as
      // /api/unsubscribe's do-not-disturb flag.
      const [inv] = await db.select({ customerId: invoices.customerId }).from(invoices).where(eq(invoices.id, run.invoiceId)).limit(1);
      if (inv) {
        await db.update(customers).set({ dndAt: new Date(), updatedAt: new Date() }).where(eq(customers.id, inv.customerId));
      }
    } else if (EVENT_TO_STATUS[type]) {
      const nextStatus = EVENT_TO_STATUS[type];
      const currentRank = STATUS_RANK[run.status] ?? -1;
      const nextRank = STATUS_RANK[nextStatus] ?? -1;
      if (nextRank > currentRank) {
        await db.update(dunningRuns).set({ status: nextStatus }).where(eq(dunningRuns.id, run.id));
      }
    }
    return NextResponse.json({ received: true, matched: true, runId: run.id, type });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[resend-delivery] failed to update run:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
