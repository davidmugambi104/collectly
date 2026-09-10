import Link from 'next/link';
import { ArrowRight, Sparkles, AlertTriangle, TrendingUp, Zap, Target, Lightbulb } from 'lucide-react';
import type { AIInsight } from '@/lib/analytics';

// Hue lives on the icon chip only. Tinting the whole row (which this used to
// do, with meta.bg on the card AND the icon) reproduced the wall-of-colour
// problem the badge system was rewritten to fix: with four insights on screen
// the page became four coloured slabs and the tint stopped carrying meaning.
// `forecast` had no semantic token at all and was on raw blue-*; it now uses
// the `info` ramp. `edge` is the 2px severity bar a priority-1 row carries —
// the same left-edge language as `.row-urgent` in the tables.
const CATEGORY_META: Record<AIInsight['category'], { icon: React.ReactNode; accent: string; chip: string; edge: string }> = {
  risk: { icon: <AlertTriangle className="h-4 w-4" />, accent: 'text-danger-700', chip: 'bg-danger-50 ring-danger-200', edge: 'bg-danger-500' },
  opportunity: { icon: <TrendingUp className="h-4 w-4" />, accent: 'text-success-700', chip: 'bg-success-50 ring-success-200', edge: 'bg-success-500' },
  forecast: { icon: <Target className="h-4 w-4" />, accent: 'text-info-700', chip: 'bg-info-50 ring-info-200', edge: 'bg-info-500' },
  action: { icon: <Zap className="h-4 w-4" />, accent: 'text-warn-700', chip: 'bg-warn-50 ring-warn-200', edge: 'bg-warn-500' },
};

export function AIInsightsPanel({ insights }: { insights: AIInsight[] }) {
  if (insights.length === 0) return null;
  return (
    // `.card-primary` — the deepest lift plus an accent hairline along the top
    // edge. This is the surface the page is organised around ("here is what to
    // do now"), and at plain `.card` it carried exactly the same weight as the
    // aging chart below it.
    <div className="card-primary overflow-hidden">
      {/* A breath of accent light entering from the top-left corner, at 5%. It
          is below the threshold of being seen as a colour; what it does is stop
          the largest white rectangle on the page reading as blank paper. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{
          background:
            'radial-gradient(420px 150px at 8% -30%, rgb(var(--brand-500) / 0.07), transparent 70%)',
        }}
      />

      <div className="relative mb-4 flex items-center gap-3">
        {/* A flat brand square, not a two-stop gradient chip — the gradient is
            the loudest "unmodified template" signal a panel header can carry.
            What it gains instead is the app's light model: a catchlight on its
            top edge and a short accent-tinted shadow, so the mark sits on the
            card rather than being printed into it. */}
        <div
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-brand-600"
          style={{ boxShadow: 'inset 0 1px 0 0 rgb(255 255 255 / 0.3), 0 2px 6px -2px rgb(var(--brand-700) / 0.55)' }}
        >
          <Sparkles className="h-[17px] w-[17px] text-white" />
        </div>
        <div className="min-w-0">
          {/* app-heading (15px), not the marketing .h3 at 20-24px. */}
          <h2 className="app-heading">AI insights</h2>
          <p className="app-meta mt-0.5 font-normal">Prioritized actions based on your A/R data</p>
        </div>
        {/* The count is a chip rather than loose grey text: it is a fact about
            the panel, and giving it an edge stops it floating in the gutter. */}
        <span
          className="ml-auto shrink-0 rounded-full border bg-ink-50 px-2 py-0.5 text-2xs font-medium tabular-nums text-ink-600"
         
        >
          {insights.length} recommendation{insights.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Rows are ranked, not merely listed. A priority-1 insight lifts onto its
          own white surface with a severity edge; everything below it stays flat
          on the card and only lifts on hover. Dividers between equal-weight
          rows (what this was) told the reader these were five interchangeable
          items, which is the opposite of what a prioritized list means. */}
      <div className="relative space-y-1">
        {insights.map((ins) => {
          const meta = CATEGORY_META[ins.category];
          const lead = ins.priority === 1;
          return (
            <Link
              key={ins.id}
              href={ins.cta.href}
              // Rest and hover lifts both live in local custom properties, so
              // the utility classes below can reference them. Writing the rest
              // shadow as an inline `boxShadow` instead would outrank the hover
              // class and the row would never move.
              style={
                {
                  '--row-rest': 'var(--catch), var(--lift-1)',
                  '--row-lift': 'var(--catch), var(--lift-2)',
                } as React.CSSProperties
              }
              className={`group relative block overflow-hidden rounded-[10px] px-3 py-3 transition-all duration-150 hover:shadow-[shadow:var(--row-lift)] ${
                lead
                  ? 'border border-ink-300/55 bg-white pl-4 shadow-[shadow:var(--row-rest)]'
                  : 'border border-transparent hover:border-ink-300/55 hover:bg-white'
              }`}
            >
              {lead && (
                <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[2px] ${meta.edge}`} />
              )}
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ring-1 ${meta.chip} ${meta.accent}`}
                  style={{ boxShadow: 'inset 0 1px 0 0 rgb(255 255 255 / 0.6)' }}
                >
                  {meta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* uppercase + wide tracking at 11px is the retired metadata
                        style; app-meta is the system's label treatment. */}
                    <span className={`app-meta capitalize ${meta.accent}`}>{ins.category}</span>
                    {lead && <span className="badge-danger">High priority</span>}
                    {/* Money on tabular figures — mono is for identifiers. It is
                        also the only figure in the row, so it takes the
                        strongest numeral weight the scale offers. */}
                    {typeof ins.amount === 'number' && (
                      <span className="num-strong text-[13px]">${ins.amount.toLocaleString()}</span>
                    )}
                  </div>
                  <h3 className={`mt-1 ${lead ? 'app-heading' : 'app-label'}`}>{ins.title}</h3>
                  <p className="app-body mt-1 max-w-[68ch] text-ink-600">{ins.detail}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 group-hover:text-brand-700">
                    {ins.cta.label}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div
        className="relative mt-4 flex items-start gap-2 border-t border-hair pt-3 app-meta font-normal"
       
      >
        <Lightbulb className="mt-px h-3.5 w-3.5 shrink-0 text-ink-400" />
        <span className="max-w-[76ch]">Insights are recomputed in real time on every page load. Powered by your actual A/R data — no mock numbers.</span>
      </div>
    </div>
  );
}
