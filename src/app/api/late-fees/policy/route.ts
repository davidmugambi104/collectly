import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { lateFeePolicy } from '@/db/schema';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { recordEvent } from '@/lib/events';
import { parsePolicyInput } from '@/lib/late-fees';

/** PUT the whole late fee policy. Changing it never touches fees already applied. */
export async function PUT(req: NextRequest) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let input: unknown = null;
  try { input = await req.json(); } catch { /* handled below */ }
  const parsed = parsePolicyInput(input);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const p = parsed.value;
  const now = new Date();
  const row = { enabled: p.enabled, kind: p.kind, value: p.value.toFixed(2), currency: p.currency, graceDays: p.graceDays, repeatMonthly: p.repeatMonthly, capPercent: p.capPercent === null ? null : p.capPercent.toFixed(2), updatedAt: now };
  await db.insert(lateFeePolicy).values({ orgId, ...row }).onConflictDoUpdate({ target: lateFeePolicy.orgId, set: row });
  await recordEvent({ orgId, type: 'late_fee.policy.updated', actorId: userId ?? undefined, payload: { ...p } });
  return NextResponse.json({ ok: true, policy: p });
}
