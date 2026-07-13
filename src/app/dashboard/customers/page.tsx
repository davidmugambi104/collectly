export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { customers, invoices } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function CustomersPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const rows = await db
    .select({
      customer: customers,
      invoiceCount: sql<number>`COUNT(${invoices.id})::int`,
      outstanding: sql<string>`COALESCE(SUM(${invoices.amount} - ${invoices.amountPaid}), 0)`,
    })
    .from(customers)
    .leftJoin(invoices, eq(invoices.customerId, customers.id))
    .where(eq(customers.orgId, orgId))
    .groupBy(customers.id)
    .orderBy(sql`outstanding DESC`)
    .limit(100);

  return (
    <AppShell title="Customers" subtitle={`${rows.length} customer${rows.length === 1 ? '' : 's'}`}>
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-ink-600">Sorted by outstanding balance.</p>
        <a href="/dashboard/customers/new" className="btn-brand text-sm"><Plus className="h-3.5 w-3.5" />Add customer</a>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 text-xs uppercase tracking-wider">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 px-4">Contact</th>
              <th className="pb-2 px-4">Channel</th>
              <th className="pb-2 px-4">Invoices</th>
              <th className="pb-2 px-4">Risk</th>
              <th className="pb-2 pl-4 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-ink-500">No customers yet. Connect an integration to import.</td></tr>}
            {rows.map((row: typeof rows[number]) => {
              const customer = row.customer;
              const invoiceCount = row.invoiceCount;
              const outstanding = row.outstanding;
              const risk = customer.paymentBehavior?.riskScore ?? 20;
              return (
                <tr key={customer.id} className="border-t border-ink-100 hover:bg-ink-50">
                  <td className="py-3 pr-4">
                    <Link href={`/dashboard/customers/${customer.id}`} className="block">
                      <div className="font-medium text-ink-900 hover:text-brand-600">{customer.name}</div>
                      {customer.company && <div className="text-xs text-ink-500">{customer.company}</div>}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-xs text-ink-600">
                    <div>{customer.email}</div>
                    <div className="text-ink-500">{customer.phone}</div>
                  </td>
                  <td className="py-3 px-4"><span className="badge-neutral capitalize">{customer.preferredChannel}</span></td>
                  <td className="py-3 px-4">{invoiceCount}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                        <div className={`h-full ${risk > 60 ? 'bg-red-500' : risk > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${risk}%` }} />
                      </div>
                      <span className="text-xs text-ink-600">{risk}</span>
                    </div>
                  </td>
                  <td className="py-3 pl-4 text-right font-mono font-semibold">{formatCurrency(outstanding)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
