import { NextRequest, NextResponse } from 'next/server';
import { cronAuthorized, configuredSecrets } from '@/lib/cron-auth';
import { pollOutreachReplies } from '@/lib/outreach-imap-poll';

export async function GET(req: NextRequest) {
  const secrets = configuredSecrets(process.env.CRON_SECRET);
  if (secrets.length === 0) {
    // Fail-closed, same as /api/cron/dunning: refuse to run rather than
    // silently skip the auth check if the env var is missing.
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 });
  }
  if (!cronAuthorized(req.headers.get('authorization'), secrets)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const t0 = Date.now();
  try {
    const result = await pollOutreachReplies();
    return NextResponse.json({ ok: true, ...result, took_ms: Date.now() - t0 });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return GET(req); }
