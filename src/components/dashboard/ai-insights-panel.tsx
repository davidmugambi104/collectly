import Link from 'next/link';
import { ArrowRight, Sparkles, AlertTriangle, TrendingUp, Zap, Target, Lightbulb } from 'lucide-react';
import type { AIInsight } from '@/lib/analytics';

const CATEGORY_META: Record<AIInsight['category'], { icon: React.ReactNode; accent: string; bg: string; ring: string }> = {
  risk: { icon: <AlertTriangle className="h-4 w-4" />, accent: 'text-red-700', bg: 'bg-red-50', ring: 'ring-red-200' },
  opportunity: { icon: <TrendingUp className="h-4 w-4" />, accent: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  forecast: { icon: <Target className="h-4 w-4" />, accent: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  action: { icon: <Zap className="h-4 w-4" />, accent: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' },
};

export function AIInsightsPanel({ insights }: { insights: AIInsight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-500 grid place-items-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="h3 leading-none">AI insights</h2>
          <p className="text-xs text-ink-500 mt-0.5">Prioritized actions based on your A/R data</p>
        </div>
        <span className="ml-auto text-xs font-mono text-ink-500">{insights.length} recommendation{insights.length === 1 ? '' : 's'}</span>
      </div>
      <div className="space-y-2">
        {insights.map((ins) => {
          const meta = CATEGORY_META[ins.category];
          return (
            <Link
              key={ins.id}
              href={ins.cta.href}
              className={`group block rounded-xl border border-ink-200 ${meta.bg} p-4 hover:border-ink-300 transition-colors`}
            >
              <div className="flex items-start gap-3">
                <div className={`shrink-0 h-8 w-8 rounded-md ${meta.bg} grid place-items-center ${meta.accent} ring-1 ${meta.ring}`}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs uppercase font-semibold tracking-wider ${meta.accent}`}>{ins.category}</span>
                    {ins.priority === 1 && <span className="badge-danger text-[10px]">High priority</span>}
                    {typeof ins.amount === 'number' && <span className="text-xs text-ink-500 font-mono">${ins.amount.toLocaleString()}</span>}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-ink-900">{ins.title}</h3>
                  <p className="mt-1 text-sm text-ink-700 leading-relaxed">{ins.detail}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 group-hover:text-brand-800">
                    {ins.cta.label} <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-ink-100 flex items-start gap-2 text-xs text-ink-500">
        <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Insights are recomputed in real time on every page load. Powered by your actual A/R data — no mock numbers.</span>
      </div>
    </div>
  );
}
