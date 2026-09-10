import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { payments, customers, invoices } from '@/db/schema';
import { eq, desc, sql, gte } from 'drizzle-orm';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Receipt } from 'lucide-react';

export const dynamic = 'force-dynamic';

/* Same craft overrides the two dashboard tables carry; see
   src/components/dashboard/invoices-table.tsx for why each one exists. */

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
      {/* `.stat-tile` + `.app-display`, not a `.card` with a 24px marketing
          bold. Two figures that are read together belong at the same weight,
          with only the colour of the collected-this-month figure separating
          them — a display size in font-display bold made these tiles shout
          louder than the table they are a summary of. */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="stat-tile">
          <div className="app-meta uppercase tracking-[0.06em]">Lifetime collected</div>
          <div className="app-display mt-1.5">{formatCurrency(total)}</div>
        </div>
        <div className="stat-tile">
          <div className="app-meta uppercase tracking-[0.06em]">Collected this month</div>
          <div className="app-display mt-1.5 text-success-700">{formatCurrency(monthTotal)}</div>
        </div>
      </div>
      {totalPaymentCount > rows.length && (
        <p className="text-xs text-ink-500 -mt-3 mb-5">Showing the latest {rows.length} of {totalPaymentCount} payments below — the totals above cover all of them.</p>
      )}

      {rows.length === 0 ? (
        <div className="panel px-6 py-16 text-center">
          <div className="chip-icon mx-auto h-11 w-11">
            <Receipt aria-hidden="true" className="h-5 w-5 text-brand-500" />
          </div>
          <h2 className="app-heading mt-4">No payments yet</h2>
          <p className="app-body mx-auto mt-1.5 max-w-sm text-ink-500">
            Payments land here automatically from Stripe, and anything collected off-platform can be recorded by hand.
          </p>
          <div className="mt-5">
            <Link href="/dashboard/invoices" className="btn-primary btn-sm h-8">Record a payment</Link>
          </div>
        </div>
      ) : (
        /* `.panel` + `.app-table`, matching invoices/customers: the table runs
            edge to edge instead of losing 40px to card padding, the header
            sticks, and cell padding comes from the system rather than per-cell
            utilities. The craft overrides and the scroll-linked header shadow
            are the same set the two dashboard tables carry — see
            src/components/dashboard/invoices-table.tsx for the reasoning. */
        <>
          <style>{`@supports (animation-timeline: scroll()) {
  @keyframes app-head-lift {
    from { box-shadow: 0 0 0 0 rgb(var(--shade) / 0); }
    to   { box-shadow: 0 6px 10px -6px rgb(var(--shade) / 0.24); }
  }
  .head-lift thead th {
    animation-name: app-head-lift;
    animation-fill-mode: both;
    animation-timing-function: linear;
    animation-timeline: scroll(nearest block);
    animation-range: 0px 20px;
  }
}`}</style>
          <div className="panel">
            <div className="max-h-[calc(100vh-13rem)] overflow-auto">
              <table className="app-table head-lift">
                <caption className="sr-only">Payments received, most recent first</caption>
                <thead>
                  <tr>
                    <th scope="col">Customer</th>
                    <th scope="col" className="w-[124px]">Invoice</th>
                    <th scope="col" className="w-[112px]">Method</th>
                    <th scope="col" className="w-[152px]">Date</th>
                    <th scope="col" className="col-num w-[140px]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: typeof rows[number]) => (
                    <tr key={row.payment.id} className="group border-l-2 border-l-transparent">
                      <td className="max-w-[320px]">
                        <Link
                          href={`/dashboard/customers/${row.customer.id}`}
                          className="block truncate text-[13px] font-medium text-ink-950 transition-colors group-hover:text-brand-700"
                        >
                          {row.customer.name}
                        </Link>
                      </td>
                      {/* Mono is for identifiers only — money uses tabular figures. */}
                      <td><Link href={`/dashboard/invoices/${row.invoice.id}`} className="link-quiet font-mono text-2xs">{row.invoice.number}</Link></td>
                      <td className="capitalize text-ink-600">{row.payment.method ?? 'manual'}</td>
                      <td className="num whitespace-nowrap text-ink-600">{formatDate(row.payment.paidAt)}</td>
                      {/* Every figure in this column is money arriving, so the
                          hue would be constant down the page and carry no
                          information. Emphasis alone does the job. */}
                      <td className="col-num num-strong">{formatCurrency(row.payment.amount, row.payment.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}