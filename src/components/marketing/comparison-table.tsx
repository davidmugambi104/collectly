'use client';
import { Check, X } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { PLAN_PRICING } from '@/lib/utils';
import { COMPETITORS, type CompetitorKey } from './comparison-data';

// Scope note: this table compares Mugavi to the AR/invoicing tools SMBs
// actually evaluate (Chaser, BILL, Melio, QuickBooks AR, FreshBooks). We
// deliberately exclude enterprise AR platforms (Gaviti, Growfin,
// HighRadius) — they target $50M+ ARR NetSuite/ERP-first orgs, not the
// 5–30 person agency we sell to. If you're an enterprise buyer, see the
// per-page comparisons under /compare.


/** Rows shown before the "show more" disclosure on mobile. */
const MOBILE_LEAD_ROWS = 4;

const ROWS: Array<[string, string, string, string, string, string, string]> = [
  ['AI dunning (tone-aware, multi-channel)', '✓', '✓', 'Reminders', 'Payment links', 'Basic', 'Basic'],
  ['Public starting price', `$${PLAN_PRICING.starter.monthly}/mo`, '~$259/mo', '$49/user/mo', '$0/mo', 'Free + fees', '$19/mo'],
  ['Per-invoice / hidden fees', 'None', 'None', 'Yes (transactions)', 'ACH/card fees', 'Transaction fees', 'ACH fees'],
  ['Time to set up', '< 10 min', 'Hours–days', 'Days', '< 10 min', '< 10 min', '< 10 min'],
  ['Built for 5–30 person teams', '✓', '✓', '✓', '✓', '✓', '✓'],
  ['Multi-currency', `${PLAN_PRICING.growth.name}+`, '✓', '✓', '✓', '—', '✓'],
  ['Multi-entity', `${PLAN_PRICING.growth.name}+`, 'Core+', 'Corporate+', '—', '—', '—'],
  ['Cash-flow forecast', `${PLAN_PRICING.growth.name}+`, 'Complete+', 'QBO only', '—', 'Basic', 'Basic'],
  ['Customer risk scoring', '✓', '✓', '—', '—', '—', '—'],
  ['Branded payment portal', '✓', '✓', '✓', 'Invoices only', '✓', '✓'],
  ['Free trial / self-serve', '14-day free', 'Demo-first', 'Free trial', 'Free forever', 'Within QBO', '30-day trial'],
  ['Time-to-value', '< 1 day', '1–2 weeks', '1–2 weeks', '< 1 day', '< 1 day', '< 1 day'],
  ['AR analytics + DSO tracking', '✓', 'Complete+', 'Basic', '—', 'Basic', 'Basic'],
  ['Payment plans / subscriptions', `${PLAN_PRICING.growth.name}+`, '✓', '✓', '—', '✓', '—'],
  ['Support model', 'Email + founder', 'Email + AM (Complete+)', 'Email + chat', 'Chat + help center', 'QBO help', 'Email + chat'],
];



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

/**
 * Pass `only` to render Mugavi against ONE competitor.
 *
 * Without it this is the six-way matrix, which is the point of /compare and
 * fine there. It was also rendering on all nine /vs-* pages, where measurement
 * put the nine at 0.40-0.44 pairwise 8-gram Jaccard and 0.95+ SequenceMatcher,
 * with a single unbroken 472-word run — 57% of /vs-chaser — reproduced word for
 * word on all eight siblings. Nine pages competing for one generic cluster
 * while none of them owns its own branded query.
 *
 * The sharpest case: Gaviti, Growfin and HighRadius are deliberately excluded
 * from this matrix (see the scope note above), so /vs-gaviti was spending the
 * majority of its body text on a table that never mentions Gaviti. For those,
 * `only` finds no column and the table renders nothing at all, which is the
 * honest outcome until each gets a comparison built for it.
 */
export function ComparisonTable({ only }: { only?: CompetitorKey } = {}) {
  const reduceMotion = useReducedMotion();
  const columns = only
    ? COMPETITORS.filter((c) => c.highlight || c.key === only)
    : COMPETITORS;

  // `only` naming a competitor this matrix does not cover.
  if (only && columns.length < 2) return null;

  const indexesOf = columns.map((c) => COMPETITORS.findIndex((x) => x.key === c.key));
  const rows: Array<[string, ...string[]]> = ROWS.map(([feat, ...vals]) =>
    [feat, ...indexesOf.map((i) => vals[i] ?? '—')] as [string, ...string[]],
  );

  return (
    // See reveal.tsx: `m` + domAnimation instead of the full motion bundle.
    <LazyMotion features={domAnimation} strict>
    <>
      {/* Mobile: stacked feature cards.
          One card per feature row, each listing every column, is the only
          honest way to show a seven-column matrix at 390px — but all eleven
          rows ran 3,000px, inside a homepage already 25 screens deep on a
          phone. The first four rows carry the argument (dunning, price, hidden
          fees, setup time); the rest is corroboration, so it goes behind a
          disclosure. <details> rather than state: it costs no JavaScript, it
          is open to find-in-page and to crawlers, and it matches how the
          pricing FAQ already works. */}
      <div className="mt-10 md:hidden">
        <div className="space-y-3">
          {rows.slice(0, MOBILE_LEAD_ROWS).map(([feat, ...vals], i) => (
            <MobileRow key={i} feat={feat} vals={vals} columns={columns} />
          ))}
        </div>
        {rows.length > MOBILE_LEAD_ROWS && (
          <details className="group mt-3">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-lg border border-ink-200 bg-white py-3 text-sm font-semibold text-ink-900">
              <span className="group-open:hidden">Show {rows.length - MOBILE_LEAD_ROWS} more comparisons</span>
              <span className="hidden group-open:inline">Show fewer</span>
            </summary>
            <div className="mt-3 space-y-3">
              {rows.slice(MOBILE_LEAD_ROWS).map(([feat, ...vals], i) => (
                <MobileRow key={i} feat={feat} vals={vals} columns={columns} />
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Desktop: table */}
      <div className="mt-10 hidden md:block overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-3 pr-4 font-semibold text-ink-600">Feature</th>
              {columns.map((c) => (
                <th key={c.key} className={`py-3 px-4 text-center font-semibold ${c.highlight ? 'text-ink-950' : 'text-ink-600'}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-ink-700">
            {rows.map(([feat, ...vals], i) => (
              // motion.tr, not <Reveal> wrapping a <tr>: a div between tbody
              // and tr is invalid table markup and browsers hoist it out,
              // which drops the zebra striping and the column alignment.
              //
              // The stagger is capped at 8 steps. Fifteen rows at 40ms each
              // would put the last row 600ms behind the first, and a table
              // that fills in for over half a second reads as slow loading
              // rather than as motion.
              <m.tr
                key={i}
                className={i % 2 ? 'bg-ink-50' : ''}
                // Same initial state server and client — see reveal.tsx.
                // `initial={reduce ? false : ...}` looks right and is not:
                // useReducedMotion() is null during SSR, so the server writes
                // opacity:0 and hydration never clears it, leaving the rows
                // invisible for reduced-motion users. Only the travel and the
                // duration vary.
                initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.3, delay: Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }
                }
              >
                <td className="py-3 pr-4">{feat}</td>
                {vals.map((v, j) => {
                  const c = columns[j];
                  return (
                    <td key={c.key} className="py-3 px-4 text-center">
                      <Cell value={v} highlight={c.highlight} />
                    </td>
                  );
                })}
              </m.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sourcing + scope note. Competitor pricing and feature claims
          change frequently; this stamp exists so prospects can tell whether
          the comparison is stale. We re-verify quarterly against each
          vendor's public pricing page. */}
      <div className="mt-6 text-xs text-ink-500 leading-relaxed">
        <p>
          <b>Scope:</b> Compared against AR/invoicing tools evaluated by 5–30 person agencies and
          consultancies. Enterprise AR platforms (Gaviti, Growfin, HighRadius) are excluded —
          they target $50M+ ARR ERP-first orgs. See <a href="/vs-freshbooks" className="underline underline-offset-2 transition-colors hover:text-ink-900">vs FreshBooks</a> or
          the <a href="/compare" className="underline underline-offset-2 transition-colors hover:text-ink-900">full comparison list</a> for the others.
        </p>
        <p className="mt-2">
          <b>Last verified:</b> 2026-07-31 against public pricing pages
          (<a href="https://www.chaserhq.com/pricing" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-ink-900">Chaser</a>,
          {' '}<a href="https://www.bill.com/pricing" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-ink-900">BILL</a>,
          {' '}<a href="https://www.melio.com/pricing" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-ink-900">Melio</a>,
          {' '}<a href="https://quickbooks.intuit.com/pricing/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-ink-900">QuickBooks</a>,
          {' '}<a href="https://www.freshbooks.com/pricing" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-ink-900">FreshBooks</a>).
          Pricing/features change; if you spot something stale,{' '}
          <a href="mailto:hello@getcollectly.app" className="underline underline-offset-2 transition-colors hover:text-ink-900">tell us</a>.
        </p>
      </div>
    </>
    </LazyMotion>
  );
}

function MobileRow({
  feat,
  vals,
  columns,
}: {
  feat: string;
  vals: string[];
  columns: { key: string; label: string; highlight?: boolean }[];
}) {
  return (
    <div className="card">
      <div className="text-sm font-semibold text-ink-900">{feat}</div>
      <div className="mt-3 space-y-2">
        {vals.map((v, j) => {
          const c = columns[j];
          return (
            <div key={c.key} className="flex items-center justify-between text-sm">
              <span className={c.highlight ? 'font-semibold text-ink-950' : 'text-ink-600'}>{c.label}</span>
              <Cell value={v} highlight={c.highlight} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
