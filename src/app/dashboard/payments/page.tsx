import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db, schema } from '@/db';
import { payments, customers, invoices } from '@/db/schema';
import { eq, desc, sql, gte } from 'drizzle-orm';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const { userId, orgId } = await getAuth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const rows = await db
    .select({ payment: payments, customer: customers, invoice: invoices })
    .from(payments)
    .innerJoin(customers, eq(customers.id, payments.customerId))
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .where(eq(payments.orgId, orgId))
    .orderBy(desc(payments.paidAt))
    .limit(100);

  // "Lifetime collected" was summed over the same 100-row page used for
  // the table below — for any org with more than 100 payments the stat
  // tile silently understated the real total, with nothing indicating it
  // was capped. Real totals now come from their own unbounded aggregate
  // queries; `rows` stays limit(100) purely for the table listing.
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [{ total: totalRaw, count: totalCount }] = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)`, count: sql<string>`count(*)` })
    .from(payments)
    .where(eq(payments.orgId, orgId));
  const [{ total: monthTotalRaw }] = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(sql`${payments.orgId} = ${orgId} AND ${gte(payments.paidAt, startOfMonth)}`);
  const total = parseFloat(totalRaw);
  const monthTotal = parseFloat(monthTotalRaw);
  const totalPaymentCount = parseInt(totalCount, 10);

  return (
    <AppShell title="Payments" subtitle={`${totalPaymentCount} payment${totalPaymentCount === 1 ? '' : 's'} · ${formatCurrency(total)} lifetime`}>
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div className="card"><div className="text-xs text-ink-500 uppercase tracking-wider font-medium">Lifetime collected</div><div className="mt-2 text-2xl font-display font-bold text-ink-950">{formatCurrency(total)}</div></div>
        <div className="card"><div className="text-xs text-ink-500 uppercase tracking-wider font-medium">Collected this month</div><div className="mt-2 text-2xl font-display font-bold text-emerald-600">{formatCurrency(monthTotal)}</div></div>
      </div>
      {totalPaymentCount > rows.length && (
        <p className="text-xs text-ink-500 -mt-3 mb-5">Showing the latest {rows.length} of {totalPaymentCount} payments below — the totals above cover all of them.</p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 text-xs uppercase tracking-wider">
              <th className="pb-2 pr-4">Customer</th>
              <th className="pb-2 px-4">Invoice</th>
              <th className="pb-2 px-4">Method</th>
              <th className="pb-2 px-4">Date</th>
              <th className="pb-2 pl-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-ink-500">No payments yet. <Link href="/dashboard/invoices" className="link">Record a payment</Link> to get started.</td></tr>}
            {rows.map((row: typeof rows[number]) => (
              <tr key={row.payment.id} className="border-t border-ink-100 hover:bg-ink-50">
                <td className="py-3 pr-4">
                  <Link href={`/dashboard/customers/${row.customer.id}`} className="font-medium text-ink-900 hover:text-brand-600">{row.customer.name}</Link>
                </td>
                <td className="py-3 px-4 font-mono text-xs"><Link href={`/dashboard/invoices/${row.invoice.id}`} className="text-brand-600 hover:text-brand-700">{row.invoice.number}</Link></td>
                <td className="py-3 px-4 capitalize text-ink-700">{row.payment.method ?? 'manual'}</td>
                <td className="py-3 px-4 text-ink-700">{formatDate(row.payment.paidAt)}</td>
                <td className="py-3 pl-4 text-right font-mono font-semibold text-emerald-600">{formatCurrency(row.payment.amount, row.payment.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
