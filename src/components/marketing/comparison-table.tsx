'use client';
import { Check, X } from 'lucide-react';

type Row = [string, string, string, string, string]; // [feature, us, hr, gg, qb]

const ROWS: Row[] = [
  ['AI dunning (tone-aware, multi-channel)', '✓', '✓', '✓', '—'],
  ['Pricing starts at', '$49/mo', '$3,000+/mo', '$500+/mo', 'Free (limited)'],
  ['Time to set up', '< 10 min', '6+ weeks', '1–2 weeks', '—'],
  ['Built for 1–50 person teams', '✓', '—', '—', '✓'],
  ['Multi-currency', '✓', '✓', '✓', '—'],
  ['Cash-flow forecast', '✓', '✓', '—', '—'],
  ['Customer risk scoring', '✓', '✓', '—', '—'],
  ['Self-service payment portal', '✓', '✓', '—', '—'],
  ['14-day free trial', '✓', '—', '—', '—'],
];

const COMPETITORS: Array<{ key: string; label: string; highlight?: boolean }> = [
  { key: 'us', label: 'Collectly', highlight: true },
  { key: 'hr', label: 'HighRadius' },
  { key: 'gg', label: 'Gaviti / Growfin' },
  { key: 'qb', label: 'QuickBooks AR' },
];

const COMPETITOR_INDEX: Record<string, 1 | 2 | 3 | 4> = { us: 1, hr: 2, gg: 3, qb: 4 };

function Cell({ value, highlight }: { value: string; highlight?: boolean }) {
  const isYes = value === '✓';
  const isNo = value === '—';
  if (isYes) {
    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${highlight ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500'}`}>
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (isNo) {
    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${highlight ? 'bg-ink-100' : 'bg-ink-50'}`}>
        <X className={`h-3.5 w-3.5 ${highlight ? 'text-ink-400' : 'text-ink-300'}`} />
      </span>
    );
  }
  return <span className={`text-sm font-medium ${highlight ? 'text-ink-900' : 'text-ink-600'}`}>{value}</span>;
}

export function ComparisonTable() {
  return (
    <>
      {/* Mobile: stacked feature cards (one per row) */}
      <div className="mt-10 md:hidden space-y-3">
        {ROWS.map(([feat, us, hr, gg, qb], i) => (
          <div key={i} className="card">
            <div className="text-sm font-semibold text-ink-900">{feat}</div>
            <div className="mt-3 space-y-2">
              {[us, hr, gg, qb].map((v, j) => {
                const c = COMPETITORS[j];
                return (
                  <div key={c.key} className="flex items-center justify-between text-sm">
                    <span className={c.highlight ? 'font-semibold text-ink-950' : 'text-ink-600'}>{c.label}</span>
                    <Cell value={v} highlight={c.highlight} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: traditional table */}
      <div className="mt-10 hidden md:block overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-3 pr-4 font-semibold text-ink-600">Feature</th>
              {COMPETITORS.map((c) => (
                <th key={c.key} className={`py-3 px-4 text-center font-semibold ${c.highlight ? 'text-ink-950' : 'text-ink-600'}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-ink-700">
            {ROWS.map(([feat, us, hr, gg, qb], i) => (
              <tr key={i} className={i % 2 ? 'bg-ink-50' : ''}>
                <td className="py-3 pr-4">{feat}</td>
                <td className="py-3 px-4 text-center"><Cell value={us} highlight /></td>
                <td className="py-3 px-4 text-center"><Cell value={hr} /></td>
                <td className="py-3 px-4 text-center"><Cell value={gg} /></td>
                <td className="py-3 px-4 text-center"><Cell value={qb} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
