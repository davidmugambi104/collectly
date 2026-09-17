export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { invoices, customers, payments, integrations } from '@/db/schema';
import { eq, and, sql, lte, desc } from 'drizzle-orm';
import { getAgingReport, getCashFlowSnapshot, getAIInsights, getCustomerInsights } from '@/lib/analytics';
import { getAuthWithOrg as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2, Sparkles, ArrowRight, ArrowUpRight, ArrowDownRight, ChevronRight, Activity, Wallet, Lightbulb, Clock } from 'lucide-react';
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
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
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

  // Direction of travel, kept separate from whether the direction is GOOD:
  // outstanding A/R falling is good news, collections falling is not, and a
  // single "positive" flag cannot express both. The arrow follows the number,
  // the colour follows the meaning.
  const outstandingDir = cash.outstandingTrend === null ? null : cash.outstandingTrend > 0 ? 'up' : 'down';
  const collectedDir = cash.collectedTrend === null ? null : cash.collectedTrend > 0 ? 'up' : 'down';

  return (
    // ONE instrument cluster, not five floating boxes. Five separate bordered
    // tiles with gaps between them read as five unrelated widgets that happened
    // to land in a row; a single lifted surface divided by hairlines reads as a
    // built object, and it is what the row of KPIs actually is — one reading of
    // one ledger. The hairlines are the container's own background showing
    // through a 1px grid gap, which keeps interior rules interior at every
    // breakpoint without per-cell border arithmetic.
    <div
      // The 1px gaps show the container's own background through, which is
      // what draws interior-only rules at every breakpoint without per-cell
      // border arithmetic. `background` is the mechanism here, not decoration.
      className="grid grid-cols-1 gap-px overflow-hidden rounded-[14px] border border-hair bg-[color:var(--hair)] lift-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      <KpiCard
        icon={<DollarSign className="h-4 w-4 text-brand-600" />}
        label="Outstanding A/R"
        value={formatCurrency(aging.total)}
        trend={cash.outstandingTrend !== null ? `${cash.outstandingTrend > 0 ? '+' : ''}${cash.outstandingTrend}% vs 30d ago` : 'No prior data'}
        trendPositive={(cash.outstandingTrend ?? 0) < 0}
        trendDir={outstandingDir}
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
        trendDir={collectedDir}
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

function KpiCard({ icon, label, value, sub, trend, trendPositive, trendDir, danger, icon2 }: { icon: React.ReactNode; label: string; value: string; sub?: string; trend?: string; trendPositive?: boolean; trendDir?: 'up' | 'down' | null; danger?: boolean; icon2?: React.ReactNode }) {
  return (
    // A cell in the band above, so it draws no border of its own — the 1px grid
    // gap is the rule between cells. Cells stretch to the tallest in their row,
    // which is what lets the metadata line up along the foot of the band.
    <div className="flex flex-col bg-white p-4">
      {/* min-h reserves two lines of label so one that wraps at five-across
          doesn't push its own value down and break the horizontal baseline the
          row of KPI numbers is read along. Cells stretch to a common height in
          the band, but the value's position is set from the top, so this is
          still the thing holding the five figures on one line. */}
      <div className="flex min-h-[2rem] items-start justify-between gap-2">
        {/* Small caps with open tracking: at 11px this reads as an instrument
            label rather than as more body copy competing with the figure. */}
        <div className="text-2xs font-medium uppercase tracking-[0.07em] text-ink-500">{label}</div>
        {/* The metric's icon sits in a recessed hairline chip. Loose coloured
            glyphs floating at the corner of a white box is the shape every
            template dashboard ships; giving each one a seat makes the five
            corners of the band agree with each other. */}
        {/* One icon gets a square 24px seat. A second one had no room in it:
            `grid place-items-center` put both glyphs in the same implicit cell,
            so the Sparkles badge on the forecast tile rendered on top of the
            TrendingUp arrow rather than beside it, and `gap-1` had nothing to
            act on. With a second glyph the chip flows along a column track and
            widens to fit instead. */}
        <div
          className={`grid h-6 shrink-0 place-items-center rounded-[7px] bg-ink-50 ring-1 ring-inset ring-ink-200/80 ${
            icon2 ? 'w-auto grid-flow-col auto-cols-max gap-1 px-1.5' : 'w-6'
          }`}
          aria-hidden="true"
        >
          {icon}
          {icon2}
        </div>
      </div>
      {/* app-display: 26px, semibold, tabular figures. This was `text-2xl
          font-display font-bold` — 700 weight, and proportional figures, so a
          row of five currency values never lined up on its digits. The app
          scale deliberately tops out at 600; bold at display size is the
          "template dashboard shouting" the system was written to avoid. */}
      <div className={`app-display mt-1.5 ${danger ? 'text-danger-600' : ''}`}>{value}</div>
      {/* Metadata is pushed to the foot of the cell, so subtitles of one and two
          lines still leave the band with a single bottom edge of small text. */}
      {(sub || trend) && (
        <div className="mt-auto pt-3">
          {trend && <TrendChip label={trend} positive={trendPositive} dir={trendDir} />}
          {sub && <div className={`app-meta font-normal leading-4 ${trend ? 'mt-1.5' : ''}`}>{sub}</div>}
        </div>
      )}
    </div>
  );
}

/** Delta as a chip: an arrow for direction, a tint for whether that is good. */
function TrendChip({ label, positive, dir }: { label: string; positive?: boolean; dir?: 'up' | 'down' | null }) {
  // No direction means there is no comparison to make ("First month"), and a
  // tinted chip would imply a judgement about a number that does not exist yet.
  if (!dir) return <div className="app-meta font-normal leading-4">{label}</div>;
  const Arrow = dir === 'up' ? ArrowUpRight : ArrowDownRight;
  const tone = positive
    ? 'bg-success-50 text-success-700 ring-success-200/70'
    : 'bg-danger-50 text-danger-700 ring-danger-200/70';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-medium tabular-nums ring-1 ring-inset ${tone}`}>
      <Arrow className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
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
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="app-heading">A/R aging</h2>
          {/* The two figures the reader came for, at the weight they deserve:
              the total as a numeral rather than buried in a grey sentence, and
              the past-due share tinted only when it is worth reacting to. */}
          <p className="mt-1 flex items-baseline gap-1.5 text-[13px] text-ink-500">
            <span className="num-strong text-[15px]">{formatCurrency(aging.total)}</span>
            outstanding
            <span className="text-ink-300" aria-hidden="true">·</span>
            <span className={`num font-medium ${overduePct >= 25 ? 'text-danger-700' : 'text-ink-700'}`}>
              {Math.round(overduePct)}% past due
            </span>
          </p>
        </div>
        <Link href="/dashboard/invoices" className="link-quiet shrink-0">View all →</Link>
      </div>

      {/* One stacked bar rather than five independent ones. Aging is a
          part-to-whole relationship, and five separate tracks forced the reader
          to compare five unrelated lengths to recover a composition they should
          simply be shown. The track is recessed and the segments are separated
          by a 1px gap of that track, so adjacent fills of similar hue (31-60
          against 61-90) stay tellable apart without outlining every segment. */}
      <div
        className="flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-ink-100"
        style={{ boxShadow: 'inset 0 1px 2px 0 rgb(var(--shade) / 0.08)' }}
        role="img"
        aria-label={rows.map((r) => `${r.label}: ${formatCurrency(r.amount)}`).join(', ')}
      >
        {rows.map((r) =>
          r.pct > 0 ? (
            <div key={r.k} className={`h-full ${r.fill} first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${r.pct}%`, boxShadow: 'inset 0 1px 0 0 rgb(255 255 255 / 0.25)' }}
              title={`${r.label} — ${formatCurrency(r.amount)}`} />
          ) : null,
        )}
      </div>

      {/* Legend doubles as the drill-down: each row filters the invoice list to
          its bucket, so the chart is navigable rather than merely informative.
          The chevron appears on hover — the affordance is there when the pointer
          is on the row and out of the way of the figures when it is not. */}
      <div className="mt-4 space-y-0.5">
        {rows.map((r) => (
          <Link
            key={r.k}
            href={`/dashboard/invoices?bucket=${encodeURIComponent(r.k)}`}
            className="group -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-ink-50"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${r.fill}`} aria-hidden="true" />
            <span className="flex-1 truncate text-[13px] text-ink-700 group-hover:text-ink-950">{r.label}</span>
            <span className="w-8 text-right text-2xs tabular-nums text-ink-400">{Math.round(r.pct)}%</span>
            <span className="w-28 text-right text-[13px] font-medium tabular-nums text-ink-950">
              {formatCurrency(r.amount)}
            </span>
            <span className="w-7 text-right text-2xs tabular-nums text-ink-400">{r.count}</span>
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-ink-300 opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

function QuickActions({ hasData, hasIntegrations, overdueCount, totalOverdue, aiCount }: { hasData: boolean; hasIntegrations: boolean; overdueCount: number; totalOverdue: number; aiCount: number }) {
  return (
    // `.section`, not `.card` — every ActionRow below is already a surface of
    // its own, so wrapping them in another one produced card-inside-card and put
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
          <div className="app-meta flex items-center gap-1.5 pt-1 font-normal">
            <Lightbulb className="h-3.5 w-3.5 shrink-0 text-ink-400" />
            {aiCount} AI recommendation{aiCount === 1 ? '' : 's'} above
          </div>
        )}
      </div>
    </div>
  );
}

function ActionRow({ href, icon, title, subtitle, danger }: { href: string; icon: React.ReactNode; title: string; subtitle: string; danger?: boolean; priority?: 'high' }) {
  return (
    // A row that can be clicked is a raised surface: catchlight, short shadow,
    // and one more step of lift on hover, so the rail reads as a stack of keys
    // rather than a list of outlined rectangles. Urgency is a left edge (the
    // `.row-urgent` language from the tables), not a pink fill — a tinted slab
    // repeated down a column stops carrying any signal at all.
    <Link
      href={href}
      // Both states live in local custom properties rather than one of them in
      // an inline `boxShadow`: an inline style outranks every class, so a rest
      // shadow written that way would silently win over its own hover state.
      style={{
        '--row-rest': 'var(--catch), var(--lift-1)',
        '--row-lift': 'var(--catch), var(--lift-2)',
      } as React.CSSProperties}
      className={`group flex items-center justify-between gap-3 rounded-[10px] border border-ink-300/55 bg-white px-3 py-2.5 shadow-[shadow:var(--row-rest)] transition-all duration-150 hover:-translate-y-px hover:shadow-[shadow:var(--row-lift)] ${
        danger ? 'row-urgent' : ''
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-ink-50 ring-1 ring-inset ring-ink-200/80"
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="app-label truncate">{title}</div>
          <div className={`app-meta truncate font-normal ${danger ? 'text-danger-700' : ''}`}>{subtitle}</div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 transition-all group-hover:translate-x-0.5 group-hover:text-ink-600" />
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
      <div className="space-y-0.5">
        {customers.slice(0, 5).map((c) => {
          const riskColor = c.riskLevel === 'critical' ? 'bg-danger-500' : c.riskLevel === 'high' ? 'bg-danger-400' : c.riskLevel === 'medium' ? 'bg-warn-400' : 'bg-success-400';
          return (
            <Link
              key={c.customerId}
              href={`/dashboard/customers/${c.customerId}`}
              style={{ '--row-lift': 'var(--catch), var(--lift-1)' } as React.CSSProperties}
              className="group -mx-2 flex items-center gap-3 rounded-[10px] border border-transparent px-2 py-2 transition-all duration-150 hover:border-ink-300/55 hover:bg-white hover:shadow-[shadow:var(--row-lift)]"
            >
              <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700 ring-1 ring-inset ring-ink-200/80">
                {c.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${riskColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="app-label truncate">{c.name}</div>
                <div className="app-meta truncate font-normal">{c.openInvoices} invoice{c.openInvoices === 1 ? '' : 's'} · {c.oldestInvoiceDays}d oldest</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="num-strong text-[13px]">{formatCurrency(c.openBalance)}</div>
                {/* The score gets a 32px meter beside it. A bare "risk 68" asks
                    the reader to remember the scale; the bar states it, and it
                    is the only way to rank five rows at a glance. */}
                <div className="mt-1 flex items-center justify-end gap-1.5">
                  <span className="app-meta font-normal">risk {c.riskScore}</span>
                  <span
                    className="h-1 w-8 overflow-hidden rounded-full bg-ink-200"
                    style={{ boxShadow: 'inset 0 1px 1px 0 rgb(var(--shade) / 0.10)' }}
                    aria-hidden="true"
                  >
                    <span className={`block h-full rounded-full ${riskColor}`} style={{ width: `${Math.min(100, c.riskScore)}%` }} />
                  </span>
                </div>
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
    // `.panel` + `.panel-toolbar`: the surface built for a full-bleed table. The
    // old markup was a `.card` whose padding had to be cancelled with negative
    // margins to let the table reach the edges, which left the header floating
    // in card padding above a table that had none.
    <div className="panel">
      <div className="panel-toolbar">
        <h2 className="app-heading">Overdue invoices</h2>
        <Link href="/dashboard/invoices?filter=overdue" className="link-quiet">
          {totalCount > rows.length ? `All ${totalCount} →` : 'Manage →'}
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="panel-body">
          <div className="rounded-xl border border-dashed border-ink-300/70 bg-ink-50/50 p-8 text-center">
            <div
              className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-success-50 ring-1 ring-inset ring-success-200"
              aria-hidden="true"
            >
              <CheckCircle2 className="h-5 w-5 text-success-600" />
            </div>
            <h3 className="app-heading mt-3">All clear</h3>
            <p className="app-body mt-1 text-ink-500">No overdue invoices. You&apos;re all caught up.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
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
                  <tr key={invoice.id} className={`group ${urgency}`}>
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
                      {/* The action stays legible but recedes until the row is
                          hovered, so five identical blue links do not read as
                          the most important column in the table. */}
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="link-quiet whitespace-nowrap text-ink-500 opacity-80 transition group-hover:text-brand-600 group-hover:opacity-100 focus-visible:text-brand-600 focus-visible:opacity-100"
                      >
                        View →
                      </Link>
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
    // Same `.panel` chrome as the overdue table beside it, so the pair reads as
    // one band of the page: money going out of the ledger on the left, money
    // coming in on the right.
    <div className="panel">
      <div className="panel-toolbar">
        <h2 className="app-heading">Recent payments</h2>
        <Link href="/dashboard/payments" className="link-quiet">View all →</Link>
      </div>
      {payments.length === 0 ? (
        <div className="panel-body">
          <div className="rounded-xl border border-dashed border-ink-300/70 bg-ink-50/50 p-8 text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink-100 ring-1 ring-inset ring-ink-200" aria-hidden="true">
              <Wallet className="h-5 w-5 text-ink-400" />
            </div>
            <h3 className="app-heading mt-3">No payments yet</h3>
            <p className="app-body mt-1 text-ink-500">When customers pay, you&apos;ll see them here.</p>
          </div>
        </div>
      ) : (
        <div>
          {payments.map((row: typeof payments[number]) => (
            <div
              key={row.payment.id}
              className="flex items-center gap-3 border-b border-hair border-ink-100 px-4 py-2.5 transition-colors last:border-b-0 hover:bg-ink-50"
            >
              <div
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success-50 ring-1 ring-inset ring-success-200/70"
                style={{ boxShadow: 'inset 0 1px 0 0 rgb(255 255 255 / 0.6)' }}
                aria-hidden="true"
              >
                <CheckCircle2 className="h-4 w-4 text-success-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="app-label truncate">{row.customer.name}</div>
                <div className="app-meta truncate font-normal">
                  {row.invoice.number} · {row.payment.paidAt ? new Date(row.payment.paidAt).toLocaleDateString() : ''}
                </div>
              </div>
              {/* Tabular figures, not mono — mono is reserved for identifiers
                  like the invoice number one line up. */}
              <div className="num-strong shrink-0 text-[13px] text-success-700">+{formatCurrency(Number(row.payment.amount), row.payment.currency)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FirstRunChecklist() {
  return (
    // The focal surface of an empty dashboard, so it takes `.card-primary` —
    // the same accent hairline and deep lift the AI panel uses when there IS
    // data. It used to be a brand-to-success diagonal gradient with a matching
    // gradient icon tile: two hues blending across a card is the single most
    // dated decoration in the file, and it also put two semantic colours
    // (accent and "success") into a surface that means neither.
    <div className="card-primary mt-6 overflow-hidden">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ background: 'radial-gradient(480px 160px at 6% -30%, rgb(var(--brand-500) / 0.08), transparent 70%)' }}
      />
      <div className="relative flex items-start gap-3.5">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-brand-600"
          style={{ boxShadow: 'inset 0 1px 0 0 rgb(255 255 255 / 0.3), 0 2px 8px -2px rgb(var(--brand-700) / 0.55)' }}
        >
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="app-title">Welcome to Collectly</h2>
          <p className="app-body mt-1 text-ink-600">Get meaningful value in 3 steps. Total time: about 2 minutes.</p>
          <ol className="mt-5 space-y-3.5">
            <Step n={1} title="Connect QuickBooks, Xero, or load sample data" desc="Pulls in customers, invoices, and payment history automatically." cta="Connect or load sample data" href="/dashboard/integrations" />
            <Step n={2} title="See your A/R aging and AI insights" desc="We'll score every customer for risk and recommend the next action." cta="Go to dashboard" href="/dashboard" />
            <Step n={3} title="Turn on AI dunning" desc="Tone-aware email + SMS reminders, auto-pause on payment or reply." cta="Set up dunning" href="/dashboard/dunning" />
          </ol>
          <p className="app-meta mt-5 max-w-[76ch] font-normal">
            <Lightbulb className="mr-1 inline h-3 w-3 text-ink-400" />
            Don&apos;t have a QuickBooks account handy? <Link href="/dashboard/integrations" className="font-medium text-brand-600 hover:text-brand-700">Load sample data</Link> to explore the product with realistic A/R.
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, desc, cta, href }: { n: number; title: string; desc: string; cta: string; href: string }) {
  return (
    <li className="flex items-start gap-3">
      {/* A filled numeral, lit like every other small surface in the app. The
          2px brand ring it used to wear made three empty circles the loudest
          thing in the card. */}
      <div
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-2xs font-semibold tabular-nums text-white"
        style={{ boxShadow: 'inset 0 1px 0 0 rgb(255 255 255 / 0.3), 0 1px 3px -1px rgb(var(--brand-700) / 0.5)' }}
      >
        {n}
      </div>
      <div className="min-w-0 flex-1">
        <div className="app-label">{title}</div>
        <div className="app-meta mt-0.5 font-normal">{desc}</div>
        <Link href={href} className="link-quiet mt-1.5">
          {cta} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </li>
  );
}
