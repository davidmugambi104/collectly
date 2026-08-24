import { NextRequest, NextResponse } from 'next/server';
import { pollInboxReplies } from '@/lib/inbox-imap-poll';

// NOT in vercel.json's active crons — pollInboxReplies() itself no-ops
// until AR_DUNNING_IMAP_USER/AR_DUNNING_IMAP_APP_PASSWORD are set (a
// dedicated AR-dunning reply address, deliberately separate from the
// cold-outreach mailbox — see src/lib/infra.ts:getDunningReplyToAddress).
// Once that address exists, add this path back to vercel.json's crons.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail-closed, same as /api/cron/dunning: refuse to run rather than
    // silently skip the auth check if the env var is missing.
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const t0 = Date.now();
  try {
    const result = await pollInboxReplies();
    return NextResponse.json({ ok: true, ...result, took_ms: Date.now() - t0 });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return GET(req); }
