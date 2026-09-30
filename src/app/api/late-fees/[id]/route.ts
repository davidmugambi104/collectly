import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { recordEvent } from '@/lib/events';
import { resolveFee } from '@/lib/late-fees-load';

/** PATCH { action: 'waive' | 'paid' } closes an applied fee: waived (not owed) or settled outside this app. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  let action: unknown;
  try { action = (await req.json())?.action; } catch { /* handled below */ }
  if (action !== 'waive' && action !== 'paid') return NextResponse.json({ error: "action must be 'waive' or 'paid'" }, { status: 400 });
  const ok = await resolveFee(orgId, id, action === 'waive' ? 'waived' : 'paid');
  if (!ok) return NextResponse.json({ error: 'That fee is already closed, or does not exist.' }, { status: 409 });
  await recordEvent({ orgId, type: action === 'waive' ? 'late_fee.waived' : 'late_fee.paid', actorId: userId ?? undefined, payload: { feeId: id } });
  return NextResponse.json({ ok: true });
}
