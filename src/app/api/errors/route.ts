import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { clientErrors } from '@/db/schema';
import { nanoid } from '@/lib/utils';
import { rateLimit, getIp } from '@/lib/rate-limit';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { getAuth } from '@/lib/auth-helper';
import { sendEmail } from '@/lib/infra';

/**
 * Durable capture for crashes caught by src/app/error.tsx and
 * global-error.tsx (see src/lib/report-client-error.ts). Public route —
 * a crash can happen before auth resolves — so this must never assume a
 * session exists, and must never itself throw or leak internals back to
 * the client. Vercel's own runtime log tail is too short-lived to rely on
 * for this (see the conversation that led here); this table doesn't expire.
 */

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'davie@getcollectly.app')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const body = z.object({
  message: z.string().min(1).max(2000),
  digest: z.string().max(100).optional(),
  stack: z.string().max(4000).optional(),
  path: z.string().max(500).optional(),
  userAgent: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  // Generous relative to other routes: a real incident can trigger this
  // boundary repeatedly across tabs/reloads for the same user, and losing
  // those rows is exactly the failure mode this endpoint exists to avoid.
  const rl = await rateLimit(getIp(req), { max: 30, windowMs: 60_000, key: 'client-errors' });
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 });

  try {
    await ensureBootstrapped();
    const data = body.parse(await req.json());

    let orgId: string | null = null;
    let userId: string | null = null;
    try {
      const session = await getAuth();
      orgId = session?.orgId ?? null;
      userId = session?.userId ?? null;
    } catch {
      // Not signed in, or auth itself is what's broken — still record the error.
    }

    await db.insert(clientErrors).values({
      id: nanoid(),
      orgId,
      userId,
      digest: data.digest ?? null,
      message: data.message,
      stack: data.stack ?? null,
      path: data.path ?? null,
      userAgent: data.userAgent ?? null,
    });

    // Best-effort admin alert, capped separately from the write above so an
    // incident that fires this endpoint 30x/minute still records every row
    // but doesn't also send 30 emails — capture must never be lossy, but
    // alerting is fine to throttle.
    const alertGate = await rateLimit('client-error-alert-email', { max: 5, windowMs: 15 * 60_000 });
    if (alertGate.allowed && ADMIN_EMAILS.length > 0) {
      sendEmail({
        to: ADMIN_EMAILS[0],
        subject: `Collectly crash: ${data.message.slice(0, 100)}`,
        html: `
          <!doctype html>
          <html><body style="font-family: -apple-system, system-ui, sans-serif; color: #16171c; max-width: 600px; margin: 0 auto; padding: 24px;">
            <p style="font-size: 15px;"><strong>${escapeHtml(data.message)}</strong></p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
              <tr><td style="padding:4px 8px;color:#6c6e76;">Path</td><td style="padding:4px 8px;">${escapeHtml(data.path ?? 'n/a')}</td></tr>
              <tr><td style="padding:4px 8px;color:#6c6e76;">Digest</td><td style="padding:4px 8px;font-family:monospace;">${escapeHtml(data.digest ?? 'n/a')}</td></tr>
              <tr><td style="padding:4px 8px;color:#6c6e76;">Org</td><td style="padding:4px 8px;">${escapeHtml(orgId ?? 'unauthenticated')}</td></tr>
              <tr><td style="padding:4px 8px;color:#6c6e76;">User</td><td style="padding:4px 8px;">${escapeHtml(userId ?? 'n/a')}</td></tr>
            </table>
            ${data.stack ? `<pre style="margin-top:16px;padding:12px;background:#f5f5f6;border-radius:8px;font-size:11px;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHtml(data.stack)}</pre>` : ''}
          </body></html>
        `,
      }).catch((e: unknown) => console.error('[errors] alert email failed:', e instanceof Error ? e.message : e));
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    // Reporting the error must not itself become an outage. Log server-side
    // (still visible in the live log tail even if this specific write failed)
    // and return 200 regardless — the client-side reporter ignores the result.
    console.error('[errors] failed to record client error:', e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
