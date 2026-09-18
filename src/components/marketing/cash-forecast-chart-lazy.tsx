'use client';

import dynamic from 'next/dynamic';

/**
 * Loads the forecast chart only when the browser gets there.
 *
 * Recharts is around 200kB. Imported directly, it took the homepage's First
 * Load JS from 102kB to 356kB — and the homepage is the LCP-critical page,
 * for a chart that sits about two thirds of the way down it. Paying for the
 * whole charting library before the hero has painted is the wrong trade.
 *
 * ssr: false, so the chart is not in the server HTML. That is acceptable
 * here and only here: the argument the section makes is carried by the
 * heading and the paragraph beside it, both server-rendered, and the chart
 * illustrates that argument rather than being the only place it is stated.
 *
 * The placeholder reserves the chart's exact height. Without it the copy
 * below jumps when the chunk lands, which is the layout shift this was
 * supposed to avoid.
 */
const CashForecastChart = dynamic(
  () => import('./cash-forecast-chart').then((m) => m.CashForecastChart),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse">
        <div className="h-4 w-36 rounded bg-ink-200" />
        <div className="mt-2 h-8 w-44 rounded bg-ink-200" />
        <div className="mt-4 h-64 w-full rounded-lg bg-ink-100" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="h-12 rounded bg-ink-100" />
          <div className="h-12 rounded bg-ink-100" />
          <div className="h-12 rounded bg-ink-100" />
        </div>
      </div>
    ),
  },
);

export function CashForecastChartLazy() {
  return <CashForecastChart />;
}
