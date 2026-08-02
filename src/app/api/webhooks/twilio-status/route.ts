import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { db } from '@/db';
import { dunningRuns } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Twilio status callback for SMS dunning sends (queued/sent/delivered/
 * undelivered/failed). Same gap this closes as
 * /api/webhooks/resend-delivery did for email: dunningRuns.status for
 * SMS runs never advanced past 'sent' set at send time.
 *
 * Matches on MessageSid against dunningRuns.externalMessageId — the
 * Twilio sid returned synchronously by sendSms() (src/lib/infra.ts) and
 * stored at send time, same column email uses for its Resend
 * Message-ID (a run is one channel or the other, no collision).
 *
 * Twilio signs with X-Twilio-Signature over the exact URL it was
 * configured to call + the form params — verified via the SDK's
 * validateRequest, not svix (different provider, different scheme).
 */
export async function POST(req: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return NextResponse.json({ error: 'missing TWILIO_AUTH_TOKEN' }, { status: 500 });
  }

  const signature = req.headers.get('x-twilio-signature') || '';
  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    params[key] = String(value);
  }

  // Must exactly match the URL Twilio was told to call (see statusCallback
  // in sendSms) — built from the same env var, not trusted request
  // headers, since a proxy could alter those.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcollectly.app';
  const url = `${appUrl}/api/webhooks/twilio-status`;

  const valid = twilio.validateRequest(authToken, signature, url, params);
  if (!valid) {
    return NextResponse.json({ error: 'signature verification failed' }, { status: 400 });
  }

  const messageSid = params.MessageSid;
  const status = params.MessageStatus;
  if (!messageSid || !status) {
    return NextResponse.json({ received: true, ignored: 'missing MessageSid/MessageStatus' });
  }

  const [run] = await db.select().from(dunningRuns).where(eq(dunningRuns.externalMessageId, messageSid)).limit(1);
  if (!run) {
    return NextResponse.json({ received: true, matched: false });
  }

  try {
    if (status === 'delivered') {
      await db.update(dunningRuns).set({ status: 'delivered' }).where(eq(dunningRuns.id, run.id));
    } else if (status === 'undelivered' || status === 'failed') {
      await db.update(dunningRuns).set({
        status: 'failed',
        error: `sms ${status}: ${params.ErrorMessage || params.ErrorCode || 'unknown error'}`,
      }).where(eq(dunningRuns.id, run.id));
    }
    // queued/sending/sent/accepted: no-op — 'sent' was already recorded
    // at send time and none of these are more informative than that.
    return NextResponse.json({ received: true, matched: true, runId: run.id, status });
  } catch (e: any) {
    console.error('[twilio-status] failed to update run:', e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? e }, { status: 500 });
  }
}
