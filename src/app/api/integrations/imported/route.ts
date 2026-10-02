import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { previewXeroData, purgeXeroData } from '@/lib/integrations/imported-data-db';
import { describeImported } from '@/lib/integrations/imported-data';

/** GET: what a Xero sync left in this organization. Changes nothing. */
export async function GET() {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const summary = await previewXeroData(orgId);
  return NextResponse.json({ ...summary, message: describeImported(summary) });
}

/** DELETE: remove it. Only this organization's rows with Xero-format ids; nothing typed in by hand or from QuickBooks. */
export async function DELETE() {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const removed = await purgeXeroData(orgId);
  return NextResponse.json({ ok: true, removed });
}
