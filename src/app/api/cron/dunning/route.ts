import { NextRequest, NextResponse } from 'next/server';
import { processDunning } from '@/lib/dunning/scheduler';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail-closed: refuse to run if the secret is not configured, rather than
    // silently skipping the auth check. Prevents an unauthenticated dunning
    // trigger if the env var is missing in a deploy environment.
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const t0 = Date.now();
  try {
    const result = await processDunning();
    return NextResponse.json({ ok: true, ...result, took_ms: Date.now() - t0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return GET(req); }
