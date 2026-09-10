export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { invoices, customers, payments, integrations } from '@/db/schema';
import { eq, and, sql, lte, desc } from 'drizzle-orm';
import { getAgingReport, getCashFlowSnapshot, getAIInsights, getCustomerInsights } from '@/lib/analytics';
import { getAuthWithOrg as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2, Sparkles, ArrowRight, Activity, Wallet, Lightbulb, Clock } from 'lucide-react';
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

      {/* Content column (cards) beside an action rail (no chrome). One spacing
          rhythm throughout: 6 between bands, 4 inside a column. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {aiInsights.length > 0 && <AIInsightsPanel insights={aiInsights} />}
          <AgingCard aging={aging} />
        </div>
        <div className="space-y-6">
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
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
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

  // Days Sales Outstanding. The single most-cited AR metric in the industry —
  // it is how bookkeepers and accountants (our ICP) actually talk about
  // collection speed — and getCashFlowSnapshot already computed it as
  // avgDaysToPay across paid invoices in the last 90 days. It was simply never
  // rendered anywhere in the product. Benchmark bands below follow the common
  // professional-services reading: <=30d healthy, 31-45d watch, >45d poor.
  const dso = cash.avgDaysToPay;
  const dsoBand =
    dso === null ? null : dso <= 30 ? 'healthy' : dso <= 45 ? 'watch' : 'poor';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      <KpiCard
        icon={<DollarSign className="h-4 w-4 text-brand-600" />}
        label="Outstanding A/R"
        value={formatCurrency(aging.total)}
        trend={cash.outstandingTrend !== null ? `${cash.outstandingTrend > 0 ? '+' : ''}${cash.outstandingTrend}% vs 30d ago` : 'No prior data'}
        trendPositive={(cash.outstandingTrend ?? 0) < 0}
        sub={!aging.hasData ? 'Connect or import data to get started' : `${aging.customerCount} customer${aging.customerCount === 1 ? '' : 's'} owe you`}
      />
      <KpiCard
        icon={<AlertCircle className="h-4 w-4 text-danger-500" />}
        label="Overdue"
        value={formatCurrency(overdueAmount)}
        sub={aging.hasData ? `${aging.invoiceCount} invoice${aging.invoiceCount === 1 ? '' : 's'} need attention` : '—'}
        danger={overdueAmount > 0}
      />
      <KpiCard
        icon={<Clock className={`h-4 w-4 ${dsoBand === 'poor' ? 'text-danger-500' : dsoBand === 'watch' ? 'text-warn-500' : 'text-success-600'}`} />}
        label="DSO"
        value={dso === null ? '—' : `${dso} days`}
        sub={
          dso === null
            ? 'Needs paid invoices to calculate'
            : dsoBand === 'healthy'
              ? 'Healthy — at or under 30 days'
              : dsoBand === 'watch'
                ? 'Watch — 31–45 days is slow for services'
                : 'Poor — over 45 days ties up cash'
        }
        danger={dsoBand === 'poor'}
      />
      <KpiCard
        icon={<CheckCircle2 className="h-4 w-4 text-success-600" />}
        label="Collected MTD"
        value={formatCurrency(cash.collectedThisMonth)}
        trend={cash.collectedTrend !== null ? `${cash.collectedTrend > 0 ? '+' : ''}${cash.collectedTrend}% vs last month` : 'First month'}
        trendPositive={(cash.collectedTrend ?? 0) > 0}
      />
      <KpiCard
        icon={<TrendingUp className="h-4 w-4 text-success-600" />}
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
    // `.stat-tile` (p-4), not `.card` (p-5) — a number and two lines of label
    // do not need card padding, and the tighter box lets five tiles sit across
    // without the row dominating the fold.
    <div className="stat-tile flex flex-col">
      {/* min-h reserves a second line so a label that wraps ("Collected this
          month" at five-across) doesn't push its own value down and break the
          horizontal baseline the row of KPI numbers is read along. */}
      <div className="flex items-start justify-between gap-2 min-h-[2.25rem]">
        <div className="app-meta">{label}</div>
        <div className="flex items-center gap-1.5 shrink-0">{icon}{icon2}</div>
      </div>
      {/* app-display: 26px, semibold, tabular figures. This was `text-2xl
          font-display font-bold` — 700 weight, and proportional figures, so a
          row of five currency values never lined up on its digits. The app
          scale deliberately tops out at 600; bold at display size is the
          "template dashboard shouting" the system was written to avoid. */}
      <div className={`app-display mt-2 ${danger ? 'text-danger-600' : ''}`}>{value}</div>
      {sub && <div className="app-meta mt-1 font-normal leading-4">{sub}</div>}
      {trend && (
        <div className={`app-meta mt-1 ${trendPositive ? 'text-success-600' : ''}`}>
          {trend}
        </div>
      )}
    </div>
  );
}

// Aging bucket definitions, ordered current → 90+ so the bar always reads
// left-to-right as increasing severity. Fills come from the `aging` token ramp
// (a sequential heat scale) rather than the semantic badge palette, so chart
// colour and status colour stay independent of each other.
const AGING_BUCKETS = [
  { k: 'current', label: 'Current', fill: 'bg-aging-current' },
  { k: '1-30', label: '1–30 days', fill: 'bg-aging-1-30' },
  { k: '31-60', label: '31–60 days', fill: 'bg-aging-31-60' },
  { k: '61-90', label: '61–90 days', fill: 'bg-aging-61-90' },
  { k: '90+', label: '90+ days', fill: 'bg-aging-90plus' },
] as const;

function AgingCard({ aging }: { aging: Awaited<ReturnType<typeof getAgingReport>> }) {
  if (!aging.hasData) return null;

  const rows = AGING_BUCKETS.map((b) => {
    const bucket = aging.buckets[b.k as keyof typeof aging.buckets];
    return {
      ...b,
      amount: bucket.amount,
      count: bucket.count,
      pct: aging.total > 0 ? (bucket.amount / aging.total) * 100 : 0,
    };
  });
  // Everything past due, which is the number the reader is actually looking for.
  const overduePct = rows.slice(1).reduce((sum, r) => sum + r.pct, 0);

  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="app-heading">A/R aging</h2>
        <Link href="/dashboard/invoices" className="link-quiet">View all →</Link>
      </div>
      <p className="app-meta mb-4">
        {formatCurrency(aging.total)} outstanding · {Math.round(overduePct)}% past due
      </p>

      {/* One stacked bar rather than five independent ones. Aging is a
          part-to-whole relationship, and five separate tracks forced the reader
          to compare five unrelated lengths to recover a composition they should
          simply be shown. */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink-100" role="img"
        aria-label={rows.map((r) => `${r.label}: ${formatCurrency(r.amount)}`).join(', ')}>
        {rows.map((r) =>
          r.pct > 0 ? (
            <div key={r.k} className={`h-full ${r.fill} first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${r.pct}%` }} title={`${r.label} — ${formatCurrency(r.amount)}`} />
          ) : null,
        )}
      </div>

      {/* Legend doubles as the drill-down: each row filters the invoice list to
          its bucket, so the chart is navigable rather than merely informative. */}
      <div className="mt-4 space-y-0.5">
        {rows.map((r) => (
          <Link
            key={r.k}
            href={`/dashboard/invoices?bucket=${encodeURIComponent(r.k)}`}
            className="-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-ink-50"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${r.fill}`} aria-hidden="true" />
            <span className="flex-1 truncate text-[13px] text-ink-700">{r.label}</span>
            <span className="text-2xs tabular-nums text-ink-400">{Math.round(r.pct)}%</span>
            <span className="w-28 text-right text-[13px] font-medium tabular-nums text-ink-950">
              {formatCurrency(r.amount)}
            </span>
            <span className="w-8 text-right text-2xs tabular-nums text-ink-400">{r.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function QuickActions({ hasData, hasIntegrations, overdueCount, totalOverdue, aiCount }: { hasData: boolean; hasIntegrations: boolean; overdueCount: number; totalOverdue: number; aiCount: number }) {
  return (
    // `.section`, not `.card` — every ActionRow below is already a bordered
    // box, so wrapping them in another one produced card-inside-card and put
    // this list at the same visual weight as the data panels beside it.
    <div className="section">
      <div className="section-head">
        <h2 className="app-heading">Next best actions</h2>
      </div>
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
          <ActionRow href="/dashboard/invoices?filter=overdue" icon={<AlertCircle className="h-4 w-4 text-danger-500" />} title={`${overdueCount} overdue invoice${overdueCount === 1 ? '' : 's'}`} subtitle={formatCurrency(totalOverdue)} danger />
        )}
        <ActionRow href="/dashboard/cash-flow" icon={<TrendingUp className="h-4 w-4 text-success-600" />} title="View 4-week cash forecast" subtitle={hasData ? 'See when payroll is safe' : 'Available after data import'} />
        {aiCount > 0 && (
          <div className="app-meta flex items-center gap-1.5 border-t border-ink-200 pt-2 font-normal">
            <Lightbulb className="h-3.5 w-3.5" />
            {aiCount} AI recommendation{aiCount === 1 ? '' : 's'} above
          </div>
        )}
      </div>
    </div>
  );
}

function ActionRow({ href, icon, title, subtitle, danger }: { href: string; icon: React.ReactNode; title: string; subtitle: string; danger?: boolean; priority?: 'high' }) {
  return (
    <Link href={href} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors group ${danger ? 'border-danger-200 bg-danger-50/30 hover:bg-danger-50' : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-md bg-white grid place-items-center border border-ink-200 shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className={`app-label truncate ${danger ? 'text-danger-900' : ''}`}>{title}</div>
          <div className={`app-meta truncate font-normal ${danger ? 'text-danger-700' : ''}`}>{subtitle}</div>
        </div>
      </div>
      <ArrowRight className={`h-4 w-4 shrink-0 group-hover:translate-x-0.5 transition-transform ${danger ? 'text-danger-400 group-hover:text-danger-700' : 'text-ink-400 group-hover:text-ink-700'}`} />
    </Link>
  );
}

function TopRiskCard({ customers }: { customers: Awaited<ReturnType<typeof getCustomerInsights>> }) {
  return (
    // `.section` — a list of customer rows that read fine directly on the
    // canvas. The right-hand column is now an action rail (no chrome) beside
    // a left column of content cards, which is what gives the page a spine.
    <div className="section">
      <div className="section-head">
        <div>
          <h2 className="app-heading">Top risk customers</h2>
          <p className="app-meta mt-0.5 font-normal">AI-scored by payment history + invoice age</p>
        </div>
      </div>
      <div className="space-y-1">
        {customers.slice(0, 5).map((c) => {
          const riskColor = c.riskLevel === 'critical' ? 'bg-danger-500' : c.riskLevel === 'high' ? 'bg-danger-400' : c.riskLevel === 'medium' ? 'bg-warn-400' : 'bg-success-400';
          return (
            <Link key={c.customerId} href={`/dashboard/customers/${c.customerId}`} className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white">
              <div className="relative h-9 w-9 rounded-full bg-ink-100 grid place-items-center text-xs font-semibold text-ink-700 shrink-0">
                {c.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${riskColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="app-label truncate">{c.name}</div>
                <div className="app-meta truncate font-normal">{c.openInvoices} invoice{c.openInvoices === 1 ? '' : 's'} · {c.oldestInvoiceDays}d oldest</div>
              </div>
              <div className="text-right shrink-0">
                <div className="num-strong text-[13px]">{formatCurrency(c.openBalance)}</div>
                <div className="app-meta font-normal">risk {c.riskScore}</div>
              </div>
            </Link>
          );
        })}
      </div>
      <Link href="/dashboard/customers" className="link-quiet mt-3">
        All customers <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function OverdueCard({ rows, totalCount }: { rows: Array<{ invoice: typeof invoices.$inferSelect; customer: typeof customers.$inferSelect }>; totalCount: number }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="app-heading">Overdue invoices</h2>
        <Link href="/dashboard/invoices?filter=overdue" className="link-quiet">
          {totalCount > rows.length ? `All ${totalCount} →` : 'Manage →'}
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 p-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-success-500 mx-auto" />
          <h3 className="mt-2 font-semibold text-ink-900">All clear!</h3>
          <p className="mt-1 text-sm text-ink-600">No overdue invoices. You&apos;re all caught up.</p>
        </div>
      ) : (
        <div className="-mx-5 -mb-5 overflow-x-auto border-t border-ink-200">
          <table className="app-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Days late</th>
                <th className="col-num">Amount</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: typeof rows[number]) => {
                const invoice = row.invoice;
                const customer = row.customer;
                const days = daysOverdue(invoice.dueDate);
                const balance = Number(invoice.amount) - Number(invoice.amountPaid);
                // Urgency as a left edge, matching the invoices table.
                const urgency = days > 60 ? 'row-urgent' : days > 0 ? 'row-warn' : '';
                return (
                  <tr key={invoice.id} className={urgency}>
                    <td>
                      <div className="font-medium text-ink-950">{customer.name}</div>
                      <div className="text-2xs text-ink-500">{customer.email}</div>
                    </td>
                    <td className="font-mono text-2xs text-ink-500">{invoice.number}</td>
                    <td>
                      <span className={days > 60 ? 'badge-danger' : days > 30 ? 'badge-warn' : 'badge-neutral'}>{days}d</span>
                    </td>
                    <td className="col-num num-strong">{formatCurrency(balance, invoice.currency)}</td>
                    <td className="col-num">
                      <Link href={`/dashboard/invoices/${invoice.id}`} className="link-quiet whitespace-nowrap">View →</Link>
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
        <h2 className="app-heading">Recent payments</h2>
        <Link href="/dashboard/payments" className="link-quiet">View all →</Link>
      </div>
      {payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 p-8 text-center">
          <Wallet className="h-8 w-8 text-ink-300 mx-auto" />
          <h3 className="mt-2 font-semibold text-ink-900 text-sm">No payments yet</h3>
          <p className="mt-1 text-xs text-ink-600">When customers pay, you&apos;ll see them here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((row: typeof payments[number]) => (
            <div key={row.payment.id} className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-ink-50 transition-colors">
              <div className="h-9 w-9 rounded-full bg-success-50 grid place-items-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-success-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink-900 truncate">{row.customer.name}</div>
                <div className="text-xs text-ink-500 truncate">
                  {row.invoice.number} · {row.payment.paidAt ? new Date(row.payment.paidAt).toLocaleDateString() : ''}
                </div>
              </div>
              <div className="text-sm font-mono font-semibold text-success-700">+{formatCurrency(Number(row.payment.amount), row.payment.currency)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FirstRunChecklist() {
  return (
    <div className="mt-6 card bg-gradient-to-br from-brand-50 to-success-50 border-brand-200">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-success-500 grid place-items-center shrink-0">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-display font-semibold text-ink-950 text-lg">Welcome to Collectly</h2>
          <p className="mt-1 text-sm text-ink-700">Get meaningful value in 3 steps. Total time: about 2 minutes.</p>
          <ol className="mt-4 space-y-3">
            <Step n={1} title="Connect QuickBooks, Xero, or load sample data" desc="Pulls in customers, invoices, and payment history automatically." cta="Connect or load sample data" href="/dashboard/integrations" />
            <Step n={2} title="See your A/R aging and AI insights" desc="We'll score every customer for risk and recommend the next action." cta="Go to dashboard" href="/dashboard" />
            <Step n={3} title="Turn on AI dunning" desc="Tone-aware email + SMS reminders, auto-pause on payment or reply." cta="Set up dunning" href="/dashboard/dunning" />
          </ol>
          <p className="mt-5 text-xs text-ink-500">
            <Lightbulb className="inline h-3 w-3 mr-1" />
            Don&apos;t have a QuickBooks account handy? <Link href="/dashboard/integrations" className="font-semibold text-brand-700 hover:text-brand-800">Load sample data</Link> to explore the product with realistic A/R.
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
