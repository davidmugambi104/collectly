export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { formatCurrency } from '@/lib/utils';
import { getCustomerInsights } from '@/lib/analytics';
import Link from 'next/link';
import { Plus, Mail, MessageSquare, Sparkles } from 'lucide-react';

export default async function CustomersPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  // Use the AI insights engine for risk + recommendation
  const insights = await getCustomerInsights(orgId, 100);
  const custList = await db.select().from(customers).where(eq(customers.orgId, orgId));
  const custMap = new Map(custList.map((c: typeof custList[number]) => [c.id, c]));
  const insightMap = new Map(insights.map((i) => [i.customerId, i]));

  // Customers with no open invoices
  const noDebt = custList.filter((c: typeof custList[number]) => !insightMap.has(c.id));

  return (
    <AppShell title="Customers" subtitle={`${custList.length} customer${custList.length === 1 ? '' : 's'} · ${insights.length} with open balance`}>
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-ink-600">Sorted by risk score (highest first). AI-recommended next action for each.</p>
        <a href="/dashboard/customers/new" className="btn-brand text-sm"><Plus className="h-3.5 w-3.5" />Add customer</a>
      </div>
      {insights.length === 0 ? (
        <div className="card text-center py-12">
          <Sparkles className="h-8 w-8 mx-auto text-ink-300" />
          <h3 className="mt-3 font-semibold text-ink-900">No open balances</h3>
          <p className="mt-1 text-sm text-ink-600">All your customers are paid up. Add an invoice or import data to see insights.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 text-xs uppercase tracking-wider">
                <th className="pb-2 pr-4">Customer</th>
                <th className="pb-2 px-4">Risk</th>
                <th className="pb-2 px-4">Open</th>
                <th className="pb-2 px-4">Channel</th>
                <th className="pb-2 px-4">AI recommendation</th>
                <th className="pb-2 pl-4 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {insights.map((row) => {
                const customer = custMap.get(row.customerId);
                if (!customer) return null;
                return (
                  <tr key={row.customerId} className="border-t border-ink-100 hover:bg-ink-50">
                    <td className="py-3 pr-4">
                      <Link href={`/dashboard/customers/${row.customerId}`} className="block group">
                        <div className="font-medium text-ink-900 group-hover:text-brand-700">{row.name}</div>
                        {row.email && <div className="text-xs text-ink-500">{row.email}</div>}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                          <div className={`h-full ${row.riskScore > 60 ? 'bg-red-500' : row.riskScore > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${row.riskScore}%` }} />
                        </div>
                        <span className="text-xs text-ink-600 font-mono">{row.riskScore}</span>
                      </div>
                      <div className="text-[10px] text-ink-500 mt-0.5 capitalize">{row.riskLevel}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-ink-600">{row.openInvoices} inv · {row.oldestInvoiceDays}d oldest</div>
                    </td>
                    <td className="py-3 px-4">
                      {row.recommendedChannel === 'sms' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-ink-600"><MessageSquare className="h-3 w-3" />SMS</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-ink-600"><Mail className="h-3 w-3" />Email</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className="text-xs text-ink-700 line-clamp-2 leading-relaxed">{row.recommendedAction}</div>
                      <div className="text-[10px] text-ink-500 mt-0.5">7d payment prob: {Math.round(row.predictedPayment7d * 100)}%</div>
                    </td>
                    <td className="py-3 pl-4 text-right font-mono font-semibold">{formatCurrency(row.openBalance)}</td>
                  </tr>
                );
              })}
              {noDebt.length > 0 && (
                <tr className="bg-emerald-50/30">
                  <td colSpan={6} className="py-3 px-4 text-xs text-emerald-700">
                    <b>{noDebt.length} customer{noDebt.length === 1 ? '' : 's'}</b> paid up — {noDebt.slice(0, 3).map((c: typeof noDebt[number]) => c.name).join(', ')}{noDebt.length > 3 ? `, +${noDebt.length - 3} more` : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
