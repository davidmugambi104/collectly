import Link from 'next/link';
import { ArrowRight, Sparkles, AlertTriangle, TrendingUp, Zap, Target, Lightbulb } from 'lucide-react';
import type { AIInsight } from '@/lib/analytics';

// Hue lives on the icon chip only. Tinting the whole row (which this used to
// do, with meta.bg on the card AND the icon) reproduced the wall-of-colour
// problem the badge system was rewritten to fix: with four insights on screen
// the page became four coloured slabs and the tint stopped carrying meaning.
// `forecast` had no semantic token at all and was on raw blue-*; it now uses
// the `info` ramp.
const CATEGORY_META: Record<AIInsight['category'], { icon: React.ReactNode; accent: string; chip: string }> = {
  risk: { icon: <AlertTriangle className="h-4 w-4" />, accent: 'text-danger-700', chip: 'bg-danger-50 ring-danger-200' },
  opportunity: { icon: <TrendingUp className="h-4 w-4" />, accent: 'text-success-700', chip: 'bg-success-50 ring-success-200' },
  forecast: { icon: <Target className="h-4 w-4" />, accent: 'text-info-700', chip: 'bg-info-50 ring-info-200' },
  action: { icon: <Zap className="h-4 w-4" />, accent: 'text-warn-700', chip: 'bg-warn-50 ring-warn-200' },
};

export function AIInsightsPanel({ insights }: { insights: AIInsight[] }) {
  if (insights.length === 0) return null;
  return (
    // `.card-primary` — a one-step-stronger border. This is the surface the
    // page is organised around ("here is what to do now"), and at plain `.card`
    // it carried exactly the same weight as the aging chart below it.
    <div className="card-primary overflow-hidden">
      <div className="flex items-center gap-2.5 mb-4">
        {/* A two-stop gradient chip is the loudest "unmodified template" signal
            in the header; a flat brand square matches the rest of the app. */}
        <div className="h-7 w-7 shrink-0 rounded-md bg-brand-600 grid place-items-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          {/* app-heading (15px), not the marketing .h3 at 20-24px. */}
          <h2 className="app-heading">AI insights</h2>
          <p className="app-meta mt-0.5">Prioritized actions based on your A/R data</p>
        </div>
        <span className="ml-auto shrink-0 app-meta num">{insights.length} recommendation{insights.length === 1 ? '' : 's'}</span>
      </div>
      <div className="divide-y divide-ink-100">
        {insights.map((ins) => {
          const meta = CATEGORY_META[ins.category];
          return (
            <Link
              key={ins.id}
              href={ins.cta.href}
              className="group -mx-2 block rounded-lg px-2 py-3 transition-colors hover:bg-ink-50"
            >
              <div className="flex items-start gap-3">
                <div className={`shrink-0 h-8 w-8 rounded-md grid place-items-center ring-1 ${meta.chip} ${meta.accent}`}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* uppercase + wide tracking at 11px is the retired metadata
                        style; app-meta is the system's label treatment. */}
                    <span className={`app-meta capitalize ${meta.accent}`}>{ins.category}</span>
                    {ins.priority === 1 && <span className="badge-danger">High priority</span>}
                    {/* Money on tabular figures — mono is for identifiers. */}
                    {typeof ins.amount === 'number' && <span className="app-meta num">${ins.amount.toLocaleString()}</span>}
                  </div>
                  <h3 className="app-label mt-1">{ins.title}</h3>
                  <p className="app-body mt-1">{ins.detail}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 group-hover:text-brand-700">
                    {ins.cta.label} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-ink-200 flex items-start gap-2 app-meta">
        <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Insights are recomputed in real time on every page load. Powered by your actual A/R data — no mock numbers.</span>
      </div>
    </div>
  );
}
