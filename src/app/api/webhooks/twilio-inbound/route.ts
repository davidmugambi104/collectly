import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { handleInboundSms } from '@/lib/sms-consent';

/**
 * Inbound SMS webhook — the reply half of the double opt-in flow.
 *
 * Twilio signs with X-Twilio-Signature over the exact URL it was configured to
 * call plus the form params, verified via the SDK's validateRequest. Same
 * scheme as /api/webhooks/twilio-status; unlike the Resend webhooks, which use
 * svix.
 *
 * The URL is rebuilt from NEXT_PUBLIC_APP_URL rather than from request headers,
 * because a proxy can alter Host and X-Forwarded-* and the signature is
 * computed over the URL Twilio was told to call.
 *
 * Responds with empty TwiML. Any reply we want to send goes out through the
 * Messages API inside handleInboundSms, not in this response body: a TwiML
 * reply would not be recorded against a message sid we can log, and the
 * consent audit needs the sid.
 */
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function twiml(): NextResponse {
  return new NextResponse(EMPTY_TWIML, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mugavi.com';
  const url = `${appUrl}/api/webhooks/twilio-inbound`;

  if (!twilio.validateRequest(authToken, signature, url, params)) {
    return NextResponse.json({ error: 'signature verification failed' }, { status: 400 });
  }

  const from = params.From;
  const body = params.Body;
  if (!from) {
    return twiml();
  }

  try {
    await handleInboundSms(from, body ?? '');
  } catch {
    // Never surface an error to Twilio: a non-2xx makes it retry, and a retried
    // STOP would log a duplicate opt-out event. The consent state is already
    // written before any reply is attempted, so a failure here is at worst a
    // missing confirmation SMS, not a lost opt-out.
  }
  return twiml();
}
