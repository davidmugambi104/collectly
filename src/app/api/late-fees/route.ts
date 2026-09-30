import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { recordEvent } from '@/lib/events';
import { decideFees, type Selection } from '@/lib/late-fees-load';

const MAX_ITEMS = 200;

/**
 * POST { action: 'apply' | 'decline', items: [{ invoiceId, period }] }
 *
 * The browser only says WHICH proposals it means. Amounts are recomputed here
 * from the policy and the invoices, so a tampered request cannot invent or
 * inflate a fee. 'apply' makes the fee owed; 'decline' records that the owner
 * chose not to charge it, so it stops being proposed.
 */
export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  await ensureDunningControlSchema();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let input: Record<string, unknown> = {};
  try { const p = await req.json(); if (p && typeof p === 'object') input = p as Record<string, unknown>; } catch { /* handled below */ }
  if (input.action !== 'apply' && input.action !== 'decline') return NextResponse.json({ error: "action must be 'apply' or 'decline'" }, { status: 400 });
  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length === 0) return NextResponse.json({ error: 'Choose at least one fee.' }, { status: 400 });
  if (items.length > MAX_ITEMS) return NextResponse.json({ error: `Choose at most ${MAX_ITEMS} fees at a time.` }, { status: 400 });
  const selections: Selection[] = [];
  for (const it of items) {
    const r = it as Record<string, unknown>;
    if (!r || typeof r.invoiceId !== 'string' || !r.invoiceId || !Number.isInteger(r.period) || (r.period as number) < 0 || (r.period as number) > 100) {
      return NextResponse.json({ error: 'Each fee needs an invoice and a period.' }, { status: 400 });
    }
    selections.push({ invoiceId: r.invoiceId, period: r.period as number });
  }

  const as = input.action === 'apply' ? 'applied' : 'waived';
  const result = await decideFees(orgId, userId ?? null, selections, as);
  if (result.recorded > 0) {
    await recordEvent({ orgId, type: as === 'applied' ? 'late_fee.applied' : 'late_fee.waived', actorId: userId ?? undefined, payload: { count: result.recorded } });
  }
  return NextResponse.json({ ok: true, ...result });
}
