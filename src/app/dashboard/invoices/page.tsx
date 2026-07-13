export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { invoices, customers } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { formatCurrency, daysOverdue, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Search, Filter, Download, Plus } from 'lucide-react';

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const sp = await searchParams;
  const filter = sp.filter ?? 'all';
  const where = filter === 'overdue'
    ? and(eq(invoices.orgId, orgId), sql`${invoices.dueDate} < NOW()`)
    : eq(invoices.orgId, orgId);

  const rows = await db
    .select({ invoice: invoices, customer: customers })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(where)
    .orderBy(invoices.dueDate)
    .limit(100);

  return (
    <AppShell title="Invoices" subtitle={`${rows.length} invoice${rows.length === 1 ? '' : 's'}`}>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input placeholder="Search invoices or customers..." className="input pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/invoices" className={`btn text-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}>All</Link>
          <Link href="/dashboard/invoices?filter=overdue" className={`btn text-sm ${filter === 'overdue' ? 'btn-primary' : 'btn-secondary'}`}>Overdue</Link>
          <Link href="/dashboard/invoices?filter=paid" className={`btn text-sm ${filter === 'paid' ? 'btn-primary' : 'btn-secondary'}`}>Paid</Link>
          <button className="btn-secondary text-sm"><Filter className="h-3.5 w-3.5" />More</button>
          <button className="btn-secondary text-sm"><Download className="h-3.5 w-3.5" />Export</button>
          <a href="/dashboard/invoices/new" className="btn-brand text-sm"><Plus className="h-3.5 w-3.5" />New invoice</a>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 text-xs uppercase tracking-wider">
              <th className="pb-2 pr-4">Customer</th>
              <th className="pb-2 px-4">Invoice</th>
              <th className="pb-2 px-4">Status</th>
              <th className="pb-2 px-4">Due</th>
              <th className="pb-2 px-4 text-right">Amount</th>
              <th className="pb-2 pl-4 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-ink-500">No invoices yet. <Link href="/dashboard/integrations" className="link">Connect QuickBooks or Xero</Link> to import.</td></tr>
            )}
            {rows.map(({ invoice, customer }) => {
              const days = daysOverdue(invoice.dueDate);
              const balance = Number(invoice.amount) - Number(invoice.amountPaid);
              return (
                <tr key={invoice.id} className="border-t border-ink-100 hover:bg-ink-50">
                  <td className="py-3 pr-4">
                    <Link href={`/dashboard/invoices/${invoice.id}`} className="block">
                      <div className="font-medium text-ink-900">{customer.name}</div>
                      <div className="text-xs text-ink-500">{customer.email ?? customer.phone}</div>
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-ink-700">{invoice.number}</td>
                  <td className="py-3 px-4">
                    {invoice.status === 'paid' ? <span className="badge-success">Paid</span>
                      : invoice.status === 'overdue' || days > 0 ? <span className="badge-danger">Overdue</span>
                      : <span className="badge-neutral capitalize">{invoice.status}</span>}
                  </td>
                  <td className="py-3 px-4 text-ink-700">{formatDate(invoice.dueDate)}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrency(invoice.amount, invoice.currency)}</td>
                  <td className="py-3 pl-4 text-right font-mono font-semibold">{formatCurrency(balance, invoice.currency)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
