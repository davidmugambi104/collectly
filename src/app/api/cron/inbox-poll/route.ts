import { NextRequest, NextResponse } from 'next/server';
import { pollInboxReplies } from '@/lib/inbox-imap-poll';

// Scheduled daily in vercel.json, but pollInboxReplies() itself no-ops
// until AR_DUNNING_IMAP_USER/AR_DUNNING_IMAP_APP_PASSWORD are set (a
// dedicated AR-dunning reply address, deliberately separate from the
// cold-outreach mailbox — see src/lib/infra.ts:getDunningReplyToAddress).
// Safe to run on schedule either way; it's a fast no-op until then.
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
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return GET(req); }
