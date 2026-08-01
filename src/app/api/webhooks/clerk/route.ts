import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { cascadeDeleteOrgData } from '@/lib/account-deletion';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/clerk
 *
 * Clerk delivers org/user lifecycle events here, signed with svix (same
 * verification shape as /api/webhooks/resend-inbound). We currently act on
 * a single event: `organization.deleted`.
 *
 * Why this exists: /api/account/delete (in-app "Delete account" flow)
 * deletes our app data first, then best-effort deletes the Clerk
 * organization. But an org can also be deleted directly from Clerk's own
 * dashboard, entirely outside the app — nothing in the app observes that,
 * so the tenant's app data (customers, invoices, payments, dunning
 * history, …) would be orphaned forever. This handler closes that gap by
 * running the same cascade delete that /api/account/delete uses.
 *
 * Idempotent / safe to replay: cascadeDeleteOrgData() first checks whether
 * the org row still exists. If /api/account/delete already ran (its own
 * Clerk org delete is in fact what triggers this webhook), the row is
 * already gone and this is a no-op — not an error.
 *
 * Setup (human step, not done here): in the Clerk dashboard, add a webhook
 * endpoint pointing at this route, subscribed to at least
 * `organization.deleted`, and set CLERK_WEBHOOK_SECRET to its signing
 * secret. This route fails closed (500) until that secret is configured.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhooks/clerk] CLERK_WEBHOOK_SECRET not configured — rejecting');
    return NextResponse.json({ error: 'missing CLERK_WEBHOOK_SECRET' }, { status: 500 });
  }

  const payload = await req.text();
  const wh = new Webhook(secret);

  let event: any;
  try {
    const headers = {
      'svix-id': req.headers.get('svix-id') || '',
      'svix-timestamp': req.headers.get('svix-timestamp') || '',
      'svix-signature': req.headers.get('svix-signature') || '',
    };
    event = wh.verify(payload, headers) as any;
  } catch (e: any) {
    return NextResponse.json({ error: `signature verification failed: ${e.message}` }, { status: 400 });
  }

  if (event?.type !== 'organization.deleted') {
    // We only handle org deletion today. Other org/user events (created,
    // updated, membership changes, …) are intentionally ignored rather than
    // guessed at — ack with 200 so Clerk doesn't retry.
    return NextResponse.json({ received: true, ignored: event?.type ?? 'unknown' });
  }

  // Clerk's organization.deleted payload carries the org id as `data.id`.
  const orgId: string | undefined = event.data?.id;
  if (!orgId) {
    console.error('[webhooks/clerk] organization.deleted event missing data.id', event);
    return NextResponse.json({ error: 'missing org id in event payload' }, { status: 400 });
  }

  try {
    const result = await cascadeDeleteOrgData(orgId, { reason: 'clerk.organization.deleted' });
    console.warn('[webhooks/clerk] organization.deleted handled', result);
    return NextResponse.json({ received: true, ...result });
  } catch (e: any) {
    console.error('[webhooks/clerk] cascade delete failed:', e?.message ?? e);
    return NextResponse.json({ error: 'cascade delete failed' }, { status: 500 });
  }
}
