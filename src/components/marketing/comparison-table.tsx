'use client';
import { Check, X } from 'lucide-react';

type CompetitorKey = 'us' | 'chaser' | 'bill' | 'melio' | 'qb';
type Row = [string, string, string, string, string, string];

const ROWS: Array<[string, string, string, string, string, string]> = [
  ['AI dunning (tone-aware, multi-channel)', '✓', '✓', 'Reminders', 'Payment links', 'Basic'],
  ['Public starting price', '$49/mo', '~$259/mo', '$49/user/mo', '$0/mo', 'Free'],
  ['Per-invoice / hidden fees', 'None', 'None', 'Yes (transactions)', 'ACH/card fees', 'Transaction fees'],
  ['Time to set up', '< 10 min', 'Hours–days', 'Days', '< 10 min', '< 10 min'],
  ['Built for 1–50 person teams', '✓', '✓', '✓', '✓', '✓'],
  ['Multi-currency', '✓', '✓', '✓', '✓', '—'],
  ['Multi-entity', 'Growth+', 'Core+', 'Corporate+', '—', '—'],
  ['Cash-flow forecast', '✓', 'Complete+', 'QBO only', '—', 'Basic'],
  ['Customer risk scoring', '✓', '✓', '—', '—', '—'],
  ['Branded payment portal', '✓', '✓', '✓', 'Invoices only', '✓'],
  ['Free trial / self-serve', '14-day free', 'Demo-first', 'Free trial', 'Free forever', 'Within QBO'],
];

const COMPETITORS: Array<{ key: CompetitorKey; label: string; highlight?: boolean }> = [
  { key: 'us', label: 'Collectly', highlight: true },
  { key: 'chaser', label: 'Chaser' },
  { key: 'bill', label: 'BILL' },
  { key: 'melio', label: 'Melio' },
  { key: 'qb', label: 'QuickBooks AR' },
];

const COMPETITOR_INDEX: Record<CompetitorKey, number> = { us: 1, chaser: 2, bill: 3, melio: 4, qb: 5 };

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
      {/* Mobile: stacked feature cards */}
      <div className="mt-10 md:hidden space-y-3">
        {ROWS.map(([feat, ...vals], i) => (
          <div key={i} className="card">
            <div className="text-sm font-semibold text-ink-900">{feat}</div>
            <div className="mt-3 space-y-2">
              {vals.map((v, j) => {
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

      {/* Desktop: table */}
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
            {ROWS.map(([feat, ...vals], i) => (
              <tr key={i} className={i % 2 ? 'bg-ink-50' : ''}>
                <td className="py-3 pr-4">{feat}</td>
                {vals.map((v, j) => {
                  const c = COMPETITORS[j];
                  return (
                    <td key={c.key} className="py-3 px-4 text-center">
                      <Cell value={v} highlight={c.highlight} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
