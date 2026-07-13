'use client';
import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Forecast {
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  confidence: 'low' | 'medium' | 'high';
  narrative: string;
}

export function CashFlowClient({ baseline }: { baseline: Forecast }) {
  const [forecast, setForecast] = useState<Forecast>(baseline);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/forecast', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setForecast(data);
      }
    } finally {
      setLoading(false);
    }
  }

  const weeks = [
    { label: 'Week 1', value: forecast.week1 },
    { label: 'Week 2', value: forecast.week2 },
    { label: 'Week 3', value: forecast.week3 },
    { label: 'Week 4', value: forecast.week4 },
  ];
  const max = Math.max(...weeks.map((w) => w.value), 1);
  const confidenceColor = forecast.confidence === 'high' ? 'text-emerald-600' : forecast.confidence === 'medium' ? 'text-amber-600' : 'text-ink-500';

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="h3">Weekly cash forecast</h2>
          <p className="text-sm text-ink-600 mt-1">Predicted incoming payments, weighted by customer payment history.</p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn-secondary text-sm shrink-0">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {loading ? 'Recalculating…' : 'Recalculate'}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4 items-end" style={{ height: 280 }}>
        {weeks.map((w) => (
          <div key={w.label} className="flex flex-col items-center justify-end h-full">
            <div className="text-xs text-ink-500 mb-2 font-mono">{formatCurrency(w.value)}</div>
            <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all" style={{ height: `${(w.value / max) * 90}%`, minHeight: 8 }} />
            <div className="mt-2 text-sm font-medium text-ink-700">{w.label}</div>
          </div>
        ))}
      </div>

      {forecast.narrative && (
        <div className="mt-6 rounded-lg bg-brand-50 border border-brand-200 p-4 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand-900 uppercase tracking-wider">AI analysis</span>
              <span className={`text-xs font-medium ${confidenceColor} capitalize`}>· {forecast.confidence} confidence</span>
            </div>
            <p className="mt-1 text-sm text-brand-900">{forecast.narrative}</p>
          </div>
        </div>
      )}
    </div>
  );
}
