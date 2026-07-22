export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { invoices, customers, payments, integrations } from '@/db/schema';
import { eq, and, sql, lte, desc } from 'drizzle-orm';
import { getAgingReport, getCashFlowSnapshot, getAIInsights, getCustomerInsights } from '@/lib/analytics';
import { getAuthWithOrg as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { DollarSign, Clock, TrendingUp, AlertCircle, CheckCircle2, Sparkles, ArrowRight, Activity, Users, Wallet, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, daysOverdue } from '@/lib/utils';
import { AIInsightsPanel } from '@/components/dashboard/ai-insights-panel';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.userId) redirect('/sign-in');
  const orgId = session.orgId;
  if (!orgId) {
    // Should never happen — getAuthWithOrg auto-creates a personal org.
    // If it does (e.g. Clerk API failure), redirect to sign-in to retry.
    redirect('/sign-in');
  }

  const [aging, cash, aiInsights, topRiskCustomers, connectedIntegrations, recentPayments] = await Promise.all([
    getAgingReport(orgId),
    getCashFlowSnapshot(orgId),
    getAIInsights(orgId),
    getCustomerInsights(orgId, 5),
    db.select().from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.status, 'connected'))),
    db
      .select({ payment: payments, customer: customers, invoice: invoices })
      .from(payments)
      .innerJoin(customers, eq(customers.id, payments.customerId))
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .where(eq(payments.orgId, orgId))
      .orderBy(desc(payments.paidAt))
      .limit(5),
  ]);

  const overdueInvoices = await db
    .select({ invoice: invoices, customer: customers })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(eq(invoices.orgId, orgId), sql`${invoices.status} IN ('sent','viewed','overdue','partial')`, lte(invoices.dueDate, new Date())))
    .orderBy(invoices.dueDate)
    .limit(5);

  return (
    <AppShell title="Overview" subtitle="Real-time view of your accounts receivable, with AI-prioritized actions.">
      <DashboardKpiGrid aging={aging} cash={cash} />

      <div className="mt-6 grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {aiInsights.length > 0 && <AIInsightsPanel insights={aiInsights} />}
          <AgingCard aging={aging} />
        </div>
        <div className="space-y-5">
          <QuickActions
            hasData={aging.hasData}
            hasIntegrations={connectedIntegrations.length > 0}
            overdueCount={aging.invoiceCount}
            totalOverdue={aging.buckets['1-30'].amount + aging.buckets['31-60'].amount + aging.buckets['61-90'].amount + aging.buckets['90+'].amount}
            aiCount={aiInsights.length}
          />
          {topRiskCustomers.length > 0 && <TopRiskCard customers={topRiskCustomers} />}
        </div>
      </div>

      {aging.hasData && (
        <div className="mt-6 grid lg:grid-cols-2 gap-5">
          <OverdueCard rows={overdueInvoices} totalCount={aging.invoiceCount} />
          <RecentPaymentsCard payments={recentPayments} />
        </div>
      )}

      {!aging.hasData && <FirstRunChecklist />}
    </AppShell>
  );
}

/* --------------------------- Components --------------------------- */

function DashboardKpiGrid({ aging, cash }: { aging: Awaited<ReturnType<typeof getAgingReport>>; cash: Awaited<ReturnType<typeof getCashFlowSnapshot>> }) {
  const overdueAmount = aging.buckets['1-30'].amount + aging.buckets['31-60'].amount + aging.buckets['61-90'].amount + aging.buckets['90+'].amount;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        icon={<DollarSign className="h-4 w-4 text-brand-600" />}
        label="Outstanding A/R"
        value={formatCurrency(aging.total)}
        trend={cash.outstandingTrend !== null ? `${cash.outstandingTrend > 0 ? '+' : ''}${cash.outstandingTrend}% vs 30d ago` : 'No prior data'}
        trendPositive={(cash.outstandingTrend ?? 0) < 0}
        sub={!aging.hasData ? 'Connect or import data to get started' : `${aging.customerCount} customer${aging.customerCount === 1 ? '' : 's'} owe you`}
      />
      <KpiCard
        icon={<AlertCircle className="h-4 w-4 text-red-500" />}
        label="Overdue"
        value={formatCurrency(overdueAmount)}
        sub={aging.hasData ? `${aging.invoiceCount} invoice${aging.invoiceCount === 1 ? '' : 's'} need attention` : '—'}
        danger={overdueAmount > 0}
      />
      <KpiCard
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        label="Collected this month"
        value={formatCurrency(cash.collectedThisMonth)}
        trend={cash.collectedTrend !== null ? `${cash.collectedTrend > 0 ? '+' : ''}${cash.collectedTrend}% vs last month` : 'First month'}
        trendPositive={(cash.collectedTrend ?? 0) > 0}
      />
      <KpiCard
        icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
        label="Forecast next 30d"
        value={formatCurrency(cash.forecast30d)}
        sub={cash.forecastReliable ? 'AI-calibrated from history' : 'Low confidence — need 5+ paid invoices'}
        icon2={cash.forecastReliable ? <Sparkles className="h-3 w-3 text-brand-500" /> : null}
      />
    </div>
  );
}

function KpiCard({ icon, label, value, sub, trend, trendPositive, danger, icon2 }: { icon: React.ReactNode; label: string; value: string; sub?: string; trend?: string; trendPositive?: boolean; danger?: boolean; icon2?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-500 uppercase tracking-wider font-medium">{label}</div>
        <div className="flex items-center gap-1.5">{icon}{icon2}</div>
      </div>
      <div className={`mt-2 text-2xl font-display font-bold ${danger ? 'text-red-600' : 'text-ink-950'}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
      {trend && (
        <div className={`mt-1 text-xs font-medium ${trendPositive ? 'text-emerald-600' : 'text-ink-500'}`}>
          {trend}
        </div>
      )}
    </div>
  );
}

function AgingCard({ aging }: { aging: Awaited<ReturnType<typeof getAgingReport>> }) {
  if (!aging.hasData) return null;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="h3">A/R aging</h2>
        <Link href="/dashboard/invoices" className="text-sm text-brand-600 hover:text-brand-700">View all →</Link>
      </div>
      <div className="space-y-2.5">
        {[
          { k: 'current', label: 'Current', cls: 'bg-ink-200' },
          { k: '1-30', label: '1–30 days', cls: 'bg-amber-300' },
          { k: '31-60', label: '31–60 days', cls: 'bg-orange-300' },
          { k: '61-90', label: '61–90 days', cls: 'bg-red-400' },
          { k: '90+', label: '90+ days', cls: 'bg-red-500' },
        ].map(({ k, label, cls }) => {
          const b = aging.buckets[k as keyof typeof aging.buckets];
          const pct = aging.total > 0 ? (b.amount / aging.total) * 100 : 0;
          return (
            <div key={k}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="text-ink-700">{label}</div>
                <div className="font-mono font-semibold">
                  {formatCurrency(b.amount)}{' '}
                  <span className="text-ink-500 text-xs font-normal">({b.count})</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                <div className={`h-full ${cls} transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickActions({ hasData, hasIntegrations, overdueCount, totalOverdue, aiCount }: { hasData: boolean; hasIntegrations: boolean; overdueCount: number; totalOverdue: number; aiCount: number }) {
  return (
    <div className="card">
      <h2 className="h3 mb-4">Next best actions</h2>
      <div className="space-y-2">
        {!hasData && (
          <>
            <ActionRow href="/dashboard/integrations" icon={<Sparkles className="h-4 w-4 text-brand-600" />} title="Connect QuickBooks or Xero" subtitle="60-second setup" priority="high" />
            <ActionRow href="/dashboard/integrations" icon={<Activity className="h-4 w-4 text-brand-600" />} title="Or load sample data" subtitle="Try every feature with realistic numbers" />
          </>
        )}
        {hasData && !hasIntegrations && (
          <ActionRow href="/dashboard/integrations" icon={<Sparkles className="h-4 w-4 text-brand-600" />} title="Connect your accounting tool" subtitle="Stop entering invoices by hand" />
        )}
        {hasData && hasIntegrations && (
          <ActionRow href="/dashboard/dunning" icon={<Sparkles className="h-4 w-4 text-brand-600" />} title="Turn on AI dunning" subtitle="Save 5+ hours/week" />
        )}
        {overdueCount > 0 && (
          <ActionRow href="/dashboard/invoices?filter=overdue" icon={<AlertCircle className="h-4 w-4 text-red-500" />} title={`${overdueCount} overdue invoice${overdueCount === 1 ? '' : 's'}`} subtitle={formatCurrency(totalOverdue)} danger />
        )}
        <ActionRow href="/dashboard/cash-flow" icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} title="View 4-week cash forecast" subtitle={hasData ? 'See when payroll is safe' : 'Available after data import'} />
        {aiCount > 0 && (
          <div className="text-xs text-ink-500 pt-2 border-t border-ink-100 flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            {aiCount} AI recommendation{aiCount === 1 ? '' : 's'} above
          </div>
        )}
      </div>
    </div>
  );
}

function ActionRow({ href, icon, title, subtitle, danger, priority }: { href: string; icon: React.ReactNode; title: string; subtitle: string; danger?: boolean; priority?: 'high' }) {
  return (
    <Link href={href} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors group ${danger ? 'border-red-200 bg-red-50/30 hover:bg-red-50' : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-md bg-white grid place-items-center border border-ink-200 shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className={`text-sm font-medium truncate ${danger ? 'text-red-900' : 'text-ink-900'}`}>{title}</div>
          <div className={`text-xs truncate ${danger ? 'text-red-700' : 'text-ink-500'}`}>{subtitle}</div>
        </div>
      </div>
      <ArrowRight className={`h-4 w-4 shrink-0 group-hover:translate-x-0.5 transition-transform ${danger ? 'text-red-400 group-hover:text-red-700' : 'text-ink-400 group-hover:text-ink-700'}`} />
    </Link>
  );
}

function TopRiskCard({ customers }: { customers: Awaited<ReturnType<typeof getCustomerInsights>> }) {
  return (
    <div className="card">
      <h2 className="h3 mb-1">Top risk customers</h2>
      <p className="text-xs text-ink-500 mb-4">AI-scored by payment history + invoice age</p>
      <div className="space-y-2">
        {customers.slice(0, 5).map((c) => {
          const riskColor = c.riskLevel === 'critical' ? 'bg-red-500' : c.riskLevel === 'high' ? 'bg-red-400' : c.riskLevel === 'medium' ? 'bg-amber-400' : 'bg-emerald-400';
          return (
            <Link key={c.customerId} href={`/dashboard/customers/${c.customerId}`} className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-ink-50 transition-colors group">
              <div className="relative h-9 w-9 rounded-full bg-ink-100 grid place-items-center text-xs font-semibold text-ink-700 shrink-0">
                {c.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${riskColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink-900 truncate">{c.name}</div>
                <div className="text-xs text-ink-500 truncate">{c.openInvoices} invoice{c.openInvoices === 1 ? '' : 's'} · {c.oldestInvoiceDays}d oldest</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono font-semibold">{formatCurrency(c.openBalance)}</div>
                <div className="text-xs text-ink-500">risk {c.riskScore}</div>
              </div>
            </Link>
          );
        })}
      </div>
      <Link href="/dashboard/customers" className="mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1">
        All customers <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function OverdueCard({ rows, totalCount }: { rows: Array<{ invoice: typeof invoices.$inferSelect; customer: typeof customers.$inferSelect }>; totalCount: number }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="h3">Overdue invoices</h2>
        <Link href="/dashboard/invoices?filter=overdue" className="text-sm text-brand-600 hover:text-brand-700">
          {totalCount > rows.length ? `All ${totalCount} →` : 'Manage →'}
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 p-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
          <h3 className="mt-2 font-semibold text-ink-900">All clear!</h3>
          <p className="mt-1 text-sm text-ink-600">No overdue invoices. You're all caught up.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 text-xs uppercase tracking-wider">
                <th className="pb-2 pr-4">Customer</th>
                <th className="pb-2 px-4">Invoice</th>
                <th className="pb-2 px-4">Days late</th>
                <th className="pb-2 px-4 text-right">Amount</th>
                <th className="pb-2 pl-4"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: typeof rows[number]) => {
                const invoice = row.invoice;
                const customer = row.customer;
                const days = daysOverdue(invoice.dueDate);
                const balance = Number(invoice.amount) - Number(invoice.amountPaid);
                return (
                  <tr key={invoice.id} className="border-t border-ink-100">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-ink-900">{customer.name}</div>
                      <div className="text-xs text-ink-500">{customer.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-ink-700">{invoice.number}</td>
                    <td className="py-3 px-4">
                      <span className={days > 60 ? 'badge-danger' : days > 30 ? 'badge-warn' : 'badge-neutral'}>{days}d</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">{formatCurrency(balance, invoice.currency)}</td>
                    <td className="py-3 pl-4 text-right">
                      <Link href={`/dashboard/invoices/${invoice.id}`} className="text-brand-600 hover:text-brand-700 text-xs font-medium whitespace-nowrap">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RecentPaymentsCard({ payments }: { payments: Array<{ payment: typeof schema.payments.$inferSelect; customer: typeof schema.customers.$inferSelect; invoice: typeof schema.invoices.$inferSelect }> }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="h3">Recent payments</h2>
        <Link href="/dashboard/payments" className="text-sm text-brand-600 hover:text-brand-700">View all →</Link>
      </div>
      {payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 p-8 text-center">
          <Wallet className="h-8 w-8 text-ink-300 mx-auto" />
          <h3 className="mt-2 font-semibold text-ink-900 text-sm">No payments yet</h3>
          <p className="mt-1 text-xs text-ink-600">When customers pay, you'll see them here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((row: typeof payments[number]) => (
            <div key={row.payment.id} className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-ink-50 transition-colors">
              <div className="h-9 w-9 rounded-full bg-emerald-50 grid place-items-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink-900 truncate">{row.customer.name}</div>
                <div className="text-xs text-ink-500 truncate">
                  {row.invoice.number} · {row.payment.paidAt ? new Date(row.payment.paidAt).toLocaleDateString() : ''}
                </div>
              </div>
              <div className="text-sm font-mono font-semibold text-emerald-700">+{formatCurrency(Number(row.payment.amount), row.payment.currency)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FirstRunChecklist() {
  return (
    <div className="mt-6 card bg-gradient-to-br from-brand-50 to-emerald-50 border-brand-200">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-500 grid place-items-center shrink-0">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-display font-semibold text-ink-950 text-lg">Welcome to Collectly 👋</h2>
          <p className="mt-1 text-sm text-ink-700">Get meaningful value in 3 steps. Total time: about 2 minutes.</p>
          <ol className="mt-4 space-y-3">
            <Step n={1} title="Connect QuickBooks, Xero, or load sample data" desc="Pulls in customers, invoices, and payment history automatically." cta="Connect or load sample data" href="/dashboard/integrations" />
            <Step n={2} title="See your A/R aging and AI insights" desc="We'll score every customer for risk and recommend the next action." cta="Go to dashboard" href="/dashboard" />
            <Step n={3} title="Turn on AI dunning" desc="Tone-aware email + SMS reminders, auto-pause on payment or reply." cta="Set up dunning" href="/dashboard/dunning" />
          </ol>
          <p className="mt-5 text-xs text-ink-500">
            <Lightbulb className="inline h-3 w-3 mr-1" />
            Don't have a QuickBooks account handy? <Link href="/dashboard/integrations" className="font-semibold text-brand-700 hover:text-brand-800">Load sample data</Link> to explore the product with realistic A/R.
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, desc, cta, href }: { n: number; title: string; desc: string; cta: string; href: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="h-7 w-7 rounded-full bg-white border-2 border-brand-500 grid place-items-center text-xs font-bold text-brand-700 shrink-0">{n}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-ink-900 text-sm">{title}</div>
        <div className="text-xs text-ink-600 mt-0.5">{desc}</div>
        <Link href={href} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">
          {cta} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </li>
  );
}
