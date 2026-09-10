'use client';
import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const PERIODS = [
  { label: 'Annual (365 days)', days: 365 },
  { label: 'Quarterly (90 days)', days: 90 },
  { label: 'Monthly (30 days)', days: 30 },
];

export function DsoCalculator({ benchmarks }: { benchmarks: Array<{ region: string; dso: number }> }) {
  const [ar, setAr] = useState(90_000);
  const [revenue, setRevenue] = useState(1_200_000);
  const [periodDays, setPeriodDays] = useState(365);

  const dso = useMemo(() => {
    if (!revenue) return 0;
    return (ar / revenue) * periodDays;
  }, [ar, revenue, periodDays]);

  const nearest = useMemo(() => {
    if (!benchmarks.length) return null;
    return benchmarks.reduce((best, b) => (Math.abs(b.dso - dso) < Math.abs(best.dso - dso) ? b : best));
  }, [benchmarks, dso]);

  return (
    <div className="mt-6 grid md:grid-cols-2 gap-4">
      <div className="border border-ink-200 rounded-lg p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <Calculator className="h-4 w-4" /> Your numbers
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Accounts receivable (open invoices)</label>
            <input type="number" min="0" step="1000" value={ar} onChange={(e) => setAr(Number(e.target.value))} className="input font-mono" />
          </div>
          <div>
            <label className="label">Revenue for the period</label>
            <input type="number" min="0" step="1000" value={revenue} onChange={(e) => setRevenue(Number(e.target.value))} className="input font-mono" />
          </div>
          <div>
            <label className="label">Period</label>
            <select value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value))} className="input">
              {PERIODS.map((p) => <option key={p.days} value={p.days}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 text-white p-5">
        <div className="text-xs uppercase tracking-wider font-semibold text-brand-200">Your DSO</div>
        <div className="mt-2 text-5xl font-display font-bold">{dso.toFixed(1)} <span className="text-2xl font-normal">days</span></div>
        <div className="mt-3 text-sm text-brand-100 font-mono">
          ({formatCurrency(ar)} ÷ {formatCurrency(revenue)}) × {periodDays} = {dso.toFixed(1)}
        </div>
        {nearest && revenue > 0 && (
          <div className="mt-4 text-sm text-brand-100">
            Closest to the <span className="font-semibold text-white">{nearest.region}</span> benchmark ({nearest.dso} days) — {dso > nearest.dso ? `${(dso - nearest.dso).toFixed(1)} days slower` : dso < nearest.dso ? `${(nearest.dso - dso).toFixed(1)} days faster` : 'right in line'}.
          </div>
        )}
      </div>
    </div>
  );
}
