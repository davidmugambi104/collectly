import { AppShell } from '@/components/app/shell';
import { db } from '@/db';
import { invoices, customers, payments, integrations } from '@/db/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { getAgingReport, getCashFlowSnapshot } from '@/lib/analytics';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DollarSign, Clock, TrendingUp, Users, AlertCircle, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, daysOverdue } from '@/lib/utils';

export default async function DashboardPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const aging = await getAgingReport(orgId);
  const cash = await getCashFlowSnapshot(orgId);

  const overdueInvoices = await db
    .select({ invoice: invoices, customer: customers })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(eq(invoices.orgId, orgId), sql`${invoices.status} IN ('sent','viewed','overdue','partial')`, lte(invoices.dueDate, new Date())))
    .orderBy(invoices.dueDate)
    .limit(10);

  const connectedIntegrations = await db.select().from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.status, 'connected')));

  return (
    <AppShell title="Overview" subtitle="Real-time view of your accounts receivable.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign className="h-4 w-4 text-brand-600" />} label="Outstanding A/R" value={formatCurrency(aging.total)} trend="+12% vs last 30d" trendPositive />
        <KpiCard icon={<AlertCircle className="h-4 w-4 text-red-500" />} label="Overdue" value={formatCurrency(aging.buckets['1-30'].amount + aging.buckets['31-60'].amount + aging.buckets['61-90'].amount + aging.buckets['90+'].amount)} sub={`${aging.invoiceCount} invoices`} />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Collected this month" value={formatCurrency(cash.collectedThisMonth)} trend={`vs ${formatCurrency(cash.collectedLastMonth)} last month`} />
        <KpiCard icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} label="Forecast next 30d" value={formatCurrency(cash.forecast30d)} sub="AI-projected" />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="h3">A/R aging</h2>
            <Link href="/dashboard/invoices" className="text-sm text-brand-600 hover:text-brand-700">View all →</Link>
          </div>
          <div className="space-y-2">
            {[
              { k: 'current', label: 'Current', cls: 'bg-ink-100' },
              { k: '1-30', label: '1–30 days', cls: 'bg-amber-100' },
              { k: '31-60', label: '31–60 days', cls: 'bg-orange-100' },
              { k: '61-90', label: '61–90 days', cls: 'bg-red-100' },
              { k: '90+', label: '90+ days', cls: 'bg-red-200' },
            ].map(({ k, label, cls }) => {
              const b = aging.buckets[k as keyof typeof aging.buckets];
              const pct = aging.total > 0 ? (b.amount / aging.total) * 100 : 0;
              return (
                <div key={k}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="text-ink-700">{label}</div>
                    <div className="font-mono font-semibold">{formatCurrency(b.amount)} <span className="text-ink-500 text-xs font-normal">({b.count})</span></div>
                  </div>
                  <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                    <div className={`h-full ${cls} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h2 className="h3 mb-4">Quick actions</h2>
          <div className="space-y-2.5">
            {connectedIntegrations.length === 0 && (
              <ActionRow href="/dashboard/integrations" icon={<Sparkles className="h-4 w-4" />} title="Connect QuickBooks or Xero" subtitle="10-min setup" />
            )}
            {connectedIntegrations.length > 0 && (
              <ActionRow href="/dashboard/dunning" icon={<Sparkles className="h-4 w-4" />} title="Turn on AI dunning" subtitle="Save 5+ hours/week" />
            )}
            <ActionRow href="/dashboard/invoices" icon={<DollarSign className="h-4 w-4" />} title="Review overdue invoices" subtitle={`${aging.invoiceCount} need attention`} />
            <ActionRow href="/dashboard/cash-flow" icon={<TrendingUp className="h-4 w-4" />} title="View cash-flow forecast" subtitle="4-week outlook" />
          </div>
        </div>
      </div>

      <div className="mt-6 card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="h3">Overdue invoices</h2>
          <Link href="/dashboard/invoices?filter=overdue" className="text-sm text-brand-600 hover:text-brand-700">All overdue →</Link>
        </div>
        {overdueInvoices.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 text-xs uppercase tracking-wider">
                  <th className="pb-2 pr-4">Customer</th>
                  <th className="pb-2 px-4">Invoice</th>
                  <th className="pb-2 px-4">Due</th>
                  <th className="pb-2 px-4">Days late</th>
                  <th className="pb-2 px-4 text-right">Amount</th>
                  <th className="pb-2 pl-4"></th>
                </tr>
              </thead>
              <tbody>
                {overdueInvoices.map(({ invoice, customer }) => {
                  const days = daysOverdue(invoice.dueDate);
                  const balance = Number(invoice.amount) - Number(invoice.amountPaid);
                  return (
                    <tr key={invoice.id} className="border-t border-ink-100">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-ink-900">{customer.name}</div>
                        <div className="text-xs text-ink-500">{customer.email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-ink-700">{invoice.number}</td>
                      <td className="py-3 px-4 text-ink-700">{invoice.dueDate.toISOString().slice(0, 10)}</td>
                      <td className="py-3 px-4">
                        <span className={days > 60 ? 'badge-danger' : days > 30 ? 'badge-warn' : 'badge-neutral'}>{days}d</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">{formatCurrency(balance, invoice.currency)}</td>
                      <td className="py-3 pl-4 text-right">
                        <Link href={`/dashboard/invoices/${invoice.id}`} className="text-brand-600 hover:text-brand-700 text-xs font-medium">View →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function KpiCard({ icon, label, value, sub, trend, trendPositive }: { icon: React.ReactNode; label: string; value: string; sub?: string; trend?: string; trendPositive?: boolean }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-500 uppercase tracking-wider font-medium">{label}</div>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-display font-bold text-ink-950">{value}</div>
      {(sub || trend) && <div className={`mt-1 text-xs ${trend ? (trendPositive ? 'text-emerald-600' : 'text-ink-500') : 'text-ink-500'}`}>{trend ?? sub}</div>}
    </div>
  );
}

function ActionRow({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 px-3 py-2.5 hover:border-ink-300 hover:bg-ink-50 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-md bg-ink-100 grid place-items-center text-ink-600">{icon}</div>
        <div>
          <div className="text-sm font-medium text-ink-900">{title}</div>
          <div className="text-xs text-ink-500">{subtitle}</div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-ink-700 transition-colors" />
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-ink-200 p-10 text-center">
      <div className="h-10 w-10 rounded-full bg-emerald-50 grid place-items-center mx-auto">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      </div>
      <h3 className="mt-3 font-semibold text-ink-900">All clear!</h3>
      <p className="mt-1 text-sm text-ink-600">No overdue invoices. You're all caught up.</p>
    </div>
  );
}
