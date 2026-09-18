'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Four-week cash forecast, as a chart rather than a sentence.
 *
 * The claim next to this used to be prose: "$14K from confirmed promises,
 * $12K from customers who always pay on time, $8K is uncertain". That is a
 * stacked bar described in words. The whole selling point is that the
 * forecast is *explainable* — you can see which part of each week's number is
 * solid and which part is hope — and a paragraph cannot show that.
 *
 * DEMO DATA. Invented for the marketing page, labelled as such in the chart
 * header. Not a customer, not an anonymised customer, not derived from any
 * real ledger.
 *
 * Colours come from the theme's CSS variables rather than hex literals, so
 * the chart tracks the palette (including dark mode) instead of drifting from
 * it the first time a ramp is retuned.
 */

type Week = {
  week: string;
  confirmed: number;
  likely: number;
  uncertain: number;
};

const DEMO_WEEKS: Week[] = [
  { week: 'Week 1', confirmed: 14_200, likely: 11_800, uncertain: 3_100 },
  { week: 'Week 2', confirmed: 9_400, likely: 16_200, uncertain: 5_600 },
  { week: 'Week 3', confirmed: 6_100, likely: 12_400, uncertain: 8_200 },
  { week: 'Week 4', confirmed: 2_800, likely: 9_600, uncertain: 11_400 },
];

const SERIES = [
  {
    key: 'confirmed' as const,
    label: 'Confirmed promise-to-pay',
    fill: 'rgb(var(--brand-600))',
    note: 'A date the customer gave you in writing.',
  },
  {
    key: 'likely' as const,
    label: 'Reliable payer, no promise',
    fill: 'rgb(var(--brand-400))',
    note: 'Weighted by how this customer has actually paid before.',
  },
  {
    key: 'uncertain' as const,
    label: 'Uncertain',
    fill: 'rgb(var(--ink-300))',
    note: 'Disputed, or the customer has never paid on time.',
  },
];

const money = (n: number) => `$${(n / 1000).toFixed(1)}k`;
const moneyFull = (n: number) => `$${n.toLocaleString('en-US')}`;

type TooltipEntry = { name?: string; value?: number; color?: string };

function ForecastTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0);
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-3 text-xs shadow-lg">
      <div className="font-display font-semibold text-ink-950">{label}</div>
      <ul className="mt-2 space-y-1">
        {payload.map((p) => (
          <li key={p.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-ink-600">
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{ background: p.color }}
                aria-hidden="true"
              />
              {p.name}
            </span>
            <span className="font-mono tabular-nums text-ink-900">{moneyFull(p.value ?? 0)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-6 border-t border-ink-200 pt-2">
        <span className="font-medium text-ink-700">Expected</span>
        <span className="font-mono font-semibold tabular-nums text-ink-950">{moneyFull(total)}</span>
      </div>
    </div>
  );
}

export function CashForecastChart() {
  const total = DEMO_WEEKS.reduce(
    (sum, w) => sum + w.confirmed + w.likely + w.uncertain,
    0,
  );

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="text-xs text-ink-500">Expected over 4 weeks</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-ink-950">
            {moneyFull(total)}
          </div>
        </div>
        <span className="text-2xs uppercase tracking-wide text-ink-500">Demo data</span>
      </div>

      {/* aria-hidden on the chart with a table underneath would be the fully
          accessible treatment; for now the figure carries a text description
          so a screen reader gets the shape of the claim rather than a wall of
          unlabelled SVG. */}
      <figure className="mt-4">
        <div className="h-64 w-full" role="img" aria-label={
          `Stacked bar chart of a four-week cash forecast totalling ${moneyFull(total)}. ` +
          `Confirmed promise-to-pay falls from ${moneyFull(DEMO_WEEKS[0].confirmed)} in week one to ` +
          `${moneyFull(DEMO_WEEKS[3].confirmed)} in week four, while the uncertain portion rises from ` +
          `${moneyFull(DEMO_WEEKS[0].uncertain)} to ${moneyFull(DEMO_WEEKS[3].uncertain)}.`
        }>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DEMO_WEEKS} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--ink-200))" vertical={false} />
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'rgb(var(--ink-500))' }}
              />
              <YAxis
                tickFormatter={money}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'rgb(var(--ink-500))' }}
                width={64}
              />
              <Tooltip
                content={<ForecastTooltip />}
                cursor={{ fill: 'rgb(var(--ink-100))' }}
              />
              {SERIES.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="forecast"
                  fill={s.fill}
                  // Only the top segment of each stack gets the rounded cap,
                  // which is the uncertain band in every week here.
                  radius={s.key === 'uncertain' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                >
                  {DEMO_WEEKS.map((w) => (
                    <Cell key={w.week} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {SERIES.map((s) => (
          <div key={s.key}>
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: s.fill }}
                aria-hidden="true"
              />
              {s.label}
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-ink-600">{s.note}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
