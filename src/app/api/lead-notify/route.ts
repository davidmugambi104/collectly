import { rateLimit, getIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { sendLeadNotification } from '@/lib/lead-notify';

const schema = z.object({
  type: z.enum(['waitlist', 'interview', 'dunning_test', 'async_qualify']),
  email: z.string().email(),
  name: z.string().optional(),
  company: z.string().optional(),
  meta: z.record(z.any()).optional(),
});

/**
 * Kept for any external caller. The in-app form routes no longer come through
 * here -- they call sendLeadNotification() directly, because reaching this
 * endpoint over HTTP from inside a serverless function meant the request was
 * frequently killed before it was sent. See src/lib/lead-notify.ts.
 */
export async function POST(req: NextRequest) {
  const rl = await rateLimit(getIp(req), { max: 10, key: 'lead-notify' });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }
  await ensureBootstrapped();
  const data = schema.parse(await req.json());
  const result = await sendLeadNotification(data);
  // A notification failure must not fail the submission that triggered it.
  return NextResponse.json({ ok: true, notified: result.ok, ...(result.error ? { error: result.error } : {}) });
}
