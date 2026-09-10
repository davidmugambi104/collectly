import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { payments, customers, invoices } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { formatCurrency, formatDate } from '@/lib/utils';
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

  const total = rows.reduce((s: number, r: typeof rows[number]) => s + Number(r.payment.amount), 0);
  const now = new Date();
  const monthTotal = rows.reduce((s: number, r: typeof rows[number]) => {
    const d = new Date(r.payment.paidAt);
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return s + Number(r.payment.amount);
    return s;
  }, 0);

  return (
    <AppShell title="Payments" subtitle={`${rows.length} payment${rows.length === 1 ? '' : 's'} · ${formatCurrency(total)} lifetime`}>
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div className="card"><div className="text-2xs font-medium text-ink-500">Lifetime collected</div><div className="mt-2 text-2xl font-display font-bold text-ink-950">{formatCurrency(total)}</div></div>
        <div className="card"><div className="text-2xs font-medium text-ink-500">Collected this month</div><div className="mt-2 text-2xl font-display font-bold text-success-600">{formatCurrency(monthTotal)}</div></div>
      </div>

      {/* `.panel` + `.app-table`, matching invoices/customers: the table runs
          edge to edge instead of losing 40px to card padding, the header sticks,
          and cell padding comes from the system rather than per-cell utilities. */}
      <div className="panel">
        <div className="max-h-[calc(100vh-13rem)] overflow-auto">
          <table className="app-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Method</th>
                <th>Date</th>
                <th className="col-num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-ink-500">No payments yet. <Link href="/dashboard/invoices" className="link-quiet">Record a payment</Link> to get started.</td></tr>
              )}
              {rows.map((row: typeof rows[number]) => (
                <tr key={row.payment.id}>
                  <td>
                    <Link href={`/dashboard/customers/${row.customer.id}`} className="font-medium text-ink-950 hover:text-brand-600">{row.customer.name}</Link>
                  </td>
                  {/* Mono is for identifiers only — money uses tabular figures. */}
                  <td><Link href={`/dashboard/invoices/${row.invoice.id}`} className="link-quiet font-mono text-2xs">{row.invoice.number}</Link></td>
                  <td className="capitalize text-ink-700">{row.payment.method ?? 'manual'}</td>
                  <td className="whitespace-nowrap text-ink-700">{formatDate(row.payment.paidAt)}</td>
                  <td className="col-num num-strong text-success-700">{formatCurrency(row.payment.amount, row.payment.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
