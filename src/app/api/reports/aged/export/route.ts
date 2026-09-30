import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { toCsv } from '@/lib/csv';
import { money } from '@/lib/aged-receivables';
import { loadAgedReport } from '@/lib/aged-receivables-load';

/** GET downloads the aged receivables report as CSV: one row per customer and currency, then a totals row per currency. */
export async function GET() {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const report = await loadAgedReport(orgId);
  const head = ['Customer', 'Currency', 'Not due', '1-30 days', '31-60 days', '61-90 days', '90+ days', 'Outstanding', 'Overdue', 'Unpaid invoices', 'Oldest overdue (days)'];
  const rows: unknown[][] = report.rows.map((r) => [r.customer, r.currency, ...r.buckets.map(money), money(r.total), money(r.overdue), r.unpaidCount, Math.max(0, r.oldestDaysOverdue)]);
  for (const t of report.totals) rows.push(['Total', t.currency, ...t.buckets.map(money), money(t.total), money(t.overdue), t.unpaidCount, '']);
  return new NextResponse(toCsv(head, rows), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="aged-receivables.csv"' },
  });
}
