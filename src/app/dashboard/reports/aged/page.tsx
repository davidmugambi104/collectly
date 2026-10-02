export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { loadAgedReport } from '@/lib/aged-receivables-load';
import { formatCurrency } from '@/lib/utils';

const HEAD = ['Not due', '1-30 days', '31-60 days', '61-90 days', '90+ days'];
const cell = (c: number, currency: string) => (c === 0 ? <span className="text-ink-500">–</span> : formatCurrency(c / 100, currency));

export default async function AgedReceivablesPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');
  const report = await loadAgedReport(orgId);

  return (
    <AppShell title="Aged receivables" subtitle="What each customer owes, by how late it is.">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/dashboard/invoices?filter=overdue" className="badge">Overdue invoices</Link>
        <a href="/api/reports/aged/export" className="btn-secondary btn-sm ml-auto" download>Export CSV</a>
      </div>
      {report.rows.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-ink-300/70 px-4 py-8 text-center app-meta">Nothing is owed right now. Unpaid invoices appear here once they are imported.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ink-200">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Aged receivables by customer, largest balance first</caption>
            <thead className="bg-ink-50 text-xs text-ink-600">
              <tr>
                <th scope="col" className="px-3 py-2">Customer</th>
                {HEAD.map((h) => <th key={h} scope="col" className="px-3 py-2 text-right">{h}</th>)}
                <th scope="col" className="px-3 py-2 text-right">Outstanding</th>
                <th scope="col" className="px-3 py-2 text-right">Overdue</th>
                <th scope="col" className="px-3 py-2 text-right">Unpaid</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={`${r.customerId}|${r.currency}`} className="border-t border-ink-100">
                  <td className="px-3 py-2"><Link href={`/dashboard/customers/${r.customerId}`} className="font-medium text-brand-700 hover:underline">{r.customer}</Link>{report.totals.length > 1 && <span className="ml-1.5 text-2xs text-ink-500">{r.currency}</span>}</td>
                  {r.buckets.map((b, i) => <td key={i} className="px-3 py-2 text-right tabular-nums">{cell(b, r.currency)}</td>)}
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{formatCurrency(r.total / 100, r.currency)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{cell(r.overdue, r.currency)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.unpaidCount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-ink-200 bg-ink-50/60 font-medium">
              {report.totals.map((t) => (
                <tr key={t.currency}>
                  <th scope="row" className="px-3 py-2 text-left">Total{report.totals.length > 1 ? ` (${t.currency})` : ''}</th>
                  {t.buckets.map((b, i) => <td key={i} className="px-3 py-2 text-right tabular-nums">{cell(b, t.currency)}</td>)}
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(t.total / 100, t.currency)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{cell(t.overdue, t.currency)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{t.unpaidCount}</td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      )}
    </AppShell>
  );
}
