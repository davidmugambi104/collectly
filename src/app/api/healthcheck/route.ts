import { NextResponse } from 'next/server';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * Lightweight health check used by the collectly-healthcheck cron job.
 * Returns 200 if the DB is reachable and the app process is alive.
 * Returns 503 if the DB is unreachable (caller will see a 5xx and alert).
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await ensureBootstrapped();
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      ok: true,
      service: 'collectly',
      uptime: process.uptime(),
      db: 'reachable',
      took_ms: Date.now() - startedAt,
      ts: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        service: 'collectly',
        db: 'unreachable',
        error: String(e?.message ?? e),
        took_ms: Date.now() - startedAt,
        ts: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
