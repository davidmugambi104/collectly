import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import fs from 'node:fs';
import path from 'node:path';

const LOG_PATH = path.resolve('/tmp', 'resend-inbound-events.jsonl');

function logInbound(event: any) {
  const line = JSON.stringify({
    type: event.type,
    received_at: new Date().toISOString(),
    id: event.data?.id,
    from: event.data?.from,
    to: event.data?.to,
    subject: event.data?.subject,
    in_reply_to: event.data?.headers?.['in-reply-to'] || event.data?.headers?.['In-Reply-To'] || null,
    references: event.data?.headers?.references || event.data?.headers?.References || null,
    message_id: event.data?.message_id || null,
    text: event.data?.text?.slice(0, 2000) || null,
    html: event.data?.html ? '[present]' : null,
    raw: event.data,
  });
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, line + '\n');
}

function matchToMessageId(event: any): string | null {
  const headers = event.data?.headers || {};
  const candidates = [
    headers['in-reply-to'],
    headers['In-Reply-To'],
    headers['references'],
    headers['References'],
    event.data?.message_id,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const ids = c.split(/\s+/).map((s: string) => s.replace(/[<>]/g, '')).filter(Boolean);
    if (ids.length) return ids[0];
  }
  return null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'missing RESEND_INBOUND_WEBHOOK_SECRET' }, { status: 500 });
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

  if (event.type !== 'email.received') {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  try {
    logInbound(event);
    const originalId = matchToMessageId(event);

    // TODO: match to outreach-log.csv by original message ID and update status
    // TODO: append to Google Sheet "Replies" tab

    return NextResponse.json({
      received: true,
      matched_message_id: originalId,
    });
  } catch (e: any) {
    console.error('resend-inbound webhook error:', e);
    return NextResponse.json({ error: e?.message ?? e }, { status: 500 });
  }
}
