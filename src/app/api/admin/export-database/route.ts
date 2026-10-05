import { NextResponse } from 'next/server';
import { requireAdminEmail } from '@/lib/auth-helper';
import { pool } from '@/db';
import { rateLimit } from '@/lib/rate-limit';
import { exportLines, type Queryable } from '@/lib/db-export';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET: download the whole database as NDJSON, minus every credential column.
 * Admin allowlist only (verified Clerk primary email), 3 downloads an hour.
 * Row contents are never logged.
 */
export async function GET() {
  const admin = await requireAdminEmail();
  if (!admin.ok) return NextResponse.json({ error: 'not authorized' }, { status: 403 });
  const rl = await rateLimit(admin.email, { key: 'db-export', max: 3, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) return NextResponse.json({ error: 'rate limited, try again later' }, { status: 429 });

  let db: Queryable;
  try {
    db = pool() as unknown as Queryable;
  } catch {
    return NextResponse.json({ error: 'export needs the production database (not the dev database)' }, { status: 400 });
  }
  console.warn('[db-export] started by an admin'); // no email, no contents

  const gen = exportLines(db);
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await gen.next();
        if (done) controller.close();
        else controller.enqueue(enc.encode(value));
      } catch (e) {
        console.warn('[db-export] failed:', e instanceof Error ? e.name : 'error');
        controller.error(e);
      }
    },
    async cancel() {
      await gen.return(undefined);
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Content-Disposition': `attachment; filename="mugavi-data-${new Date().toISOString().slice(0, 10)}.ndjson"`,
      'Cache-Control': 'no-store',
    },
  });
}
