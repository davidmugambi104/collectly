import { NextRequest, NextResponse } from 'next/server';
import { processDunning } from '@/lib/dunning/scheduler';
import { cronAuthorized, configuredSecrets } from '@/lib/cron-auth';

export async function GET(req: NextRequest) {
  // Vercel's daily cron sends CRON_SECRET; the hourly GitHub job sends its own
  // DUNNING_TRIGGER_SECRET, so the shared CRON_SECRET never leaves Vercel.
  const secrets = configuredSecrets(process.env.CRON_SECRET, process.env.DUNNING_TRIGGER_SECRET);
  if (secrets.length === 0) {
    // Fail-closed: refuse to run if no secret is configured, rather than
    // silently skipping the auth check. Prevents an unauthenticated dunning
    // trigger if the env vars are missing in a deploy environment.
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 });
  }
  if (!cronAuthorized(req.headers.get('authorization'), secrets)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const t0 = Date.now();
  try {
    const result = await processDunning();
    return NextResponse.json({ ok: true, ...result, took_ms: Date.now() - t0 });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return GET(req); }
