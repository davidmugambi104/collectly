import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth-helper';
import { rateLimit, getIp } from '@/lib/rate-limit';
import { parseJsonBody } from '@/lib/parse-body';
import { sendConsentInvite } from '@/lib/sms-consent';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureSmsConsentSchema } from '@/lib/sms-consent-schema';

const body = z.object({ customerId: z.string().min(1) });

/**
 * Send the SMS opt-in invite to one customer.
 *
 * Authenticated and org-scoped: the customer must belong to the caller's org,
 * checked here rather than trusted from the body, so a valid session cannot
 * invite another tenant's contacts.
 */
export async function POST(req: NextRequest) {
  const rl = await rateLimit(getIp(req), { max: 20, key: 'sms-consent-invite' });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  await ensureBootstrapped();
  await ensureSmsConsentSchema();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = await parseJsonBody(req, body);
  if (!parsed.ok) return parsed.response;

  const [customer] = await db.select().from(customers).where(eq(customers.id, parsed.data.customerId)).limit(1);
  if (!customer || customer.orgId !== orgId) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const result = await sendConsentInvite(parsed.data.customerId);
  if (!result.ok) {
    // 409, not 500: "already opted in" and "has opted out" are states, not
    // faults, and the caller should be told which rather than shown an error.
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true, status: result.status, sid: result.sid });
}
