import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { isWorkspaceOwnerOrAdmin } from '@/lib/org-role-load';
import { exportCsv, exportZip, parseDataset } from '@/lib/export-data';
import { loadExportBundle } from '@/lib/export-data-load';
import { rateLimit } from '@/lib/rate-limit';
import { recordEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

/**
 * GET downloads this workspace's data. No query: one ZIP with customers, invoices, reminders, statements
 * (what each customer owes) and statements sent. ?dataset=customers|invoices|reminders|statements: that one CSV.
 * Owner or org admin only: it is the whole customer list.
 */
export async function GET(req: NextRequest) {
  await ensureBootstrapped();
  const a = await getAuth() as { userId?: string | null; orgId?: string | null; orgRole?: string | null };
  if (!a.orgId || !a.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isWorkspaceOwnerOrAdmin({ userId: a.userId, orgId: a.orgId, orgRole: a.orgRole }))) {
    return NextResponse.json({ error: 'Only the workspace owner or an admin can export everything.' }, { status: 403 });
  }
  const rl = await rateLimit(a.orgId, { max: 10, windowMs: 3_600_000, key: 'data-export' });
  if (!rl.allowed) return NextResponse.json({ error: 'You have exported a lot this hour. Try again shortly.' }, { status: 429 });

  const raw = req.nextUrl.searchParams.get('dataset');
  const dataset = raw ? parseDataset(raw) : null;
  if (raw && !dataset) return NextResponse.json({ error: 'dataset must be customers, invoices, reminders or statements' }, { status: 400 });

  const bundle = await loadExportBundle(a.orgId);
  try { await recordEvent({ orgId: a.orgId, type: 'data.exported', payload: { dataset: dataset ?? 'all' }, actorId: a.userId }); } catch { /* the download matters more than the log */ }
  const stamp = bundle.now.toISOString().slice(0, 10);
  if (dataset) {
    return new NextResponse(exportCsv(dataset, bundle), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="mugavi-${dataset}-${stamp}.csv"`, 'cache-control': 'no-store' } });
  }
  return new NextResponse(new Uint8Array(exportZip(bundle)), { headers: { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="mugavi-export-${stamp}.zip"`, 'cache-control': 'no-store' } });
}
