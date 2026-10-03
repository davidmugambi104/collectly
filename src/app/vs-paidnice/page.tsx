import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import {
  ComparisonHero,
  ComparisonDiffGrid,
  CompetitorGrowthStrategy,
  WhenToChoose,
  ComparisonCta, ComparisonChecked } from '@/components/marketing/comparison-section';
import { DollarSign, Layers, Users, FileText } from 'lucide-react';
import { pageMetadata, comparisonFaqJsonLd } from '@/lib/seo';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import { PracticeCostCalculator } from '@/components/marketing/practice-cost-calculator';
import { crossoverBooks, mugaviCost, paidniceCost, PAIDNICE_ENTITY_MONTHLY, type MugaviPrices } from '@/lib/practice-cost';
import {
  PLAN_PRICING,
  PRACTICE_INCLUDED_ORGS,
  PRACTICE_EXTRA_ORG_MONTHLY,
  PRACTICE_SCALE_INCLUDED_ORGS,
} from '@/lib/utils';

/**
 * Paidnice figures are published at paidnice.com/pricing and were read on
 * 2026-09-20 and re-read 2026-10-03 (no change). They are quoted, not estimated, and the arithmetic below is
 * derived from their own two published rates: the Pro tier price for a given
 * monthly invoice volume, and $29/month for each entity beyond the first.
 *
 * The honest finding this page is built on: below some number of client books
 * Paidnice costs less than we do, and above it we cost less. That number depends
 * on how many invoices each book sends: about a dozen at 30 a month, nearer 20 at
 * 10 a month (practice-cost.test.ts pins the values). Saying so is the
 * point -- a practice can check the arithmetic in a minute, and a comparison
 * page that loses that check loses the reader with it.
 */
const MUGAVI_PRICES: MugaviPrices = {
  single: PLAN_PRICING.starter.monthly,
  practice: PLAN_PRICING.growth.monthly,
  practiceBooks: PRACTICE_INCLUDED_ORGS,
  extraBook: PRACTICE_EXTRA_ORG_MONTHLY,
  scale: PLAN_PRICING.scale.monthly,
  scaleBooks: PRACTICE_SCALE_INCLUDED_ORGS,
};

/** Books at which we become cheaper, at a few invoice volumes per book (see practice-cost.test.ts). */
const CROSSOVER_30 = crossoverBooks(30, MUGAVI_PRICES);
const CROSSOVER_10 = crossoverBooks(10, MUGAVI_PRICES);

const ROWS = [1, 5, 10, 15, 20, 30, 50, 100].map((books) => {
  const them = paidniceCost(books, 30)?.monthly ?? null;
  const us = mugaviCost(books, MUGAVI_PRICES)?.monthly ?? 0;
  return { books, them, us, cheaper: them !== null && them < us ? 'Paidnice' : 'Mugavi' };
});

export const metadata = pageMetadata({
  title: 'Mugavi vs Paidnice: per client book, not per invoice',
  description:
    'Paidnice charges by invoice volume plus $29 per extra entity. Mugavi ' +
    `charges per client book: $${PLAN_PRICING.growth.monthly}/mo for ${PRACTICE_INCLUDED_ORGS} of them. ` +
    'Below about a dozen books at 30 invoices each a month, Paidnice costs less; above it we do. Fewer invoices per book moves that point up. A calculator and the full arithmetic.',
  path: '/vs-paidnice',
  keywords: ['Mugavi vs Paidnice', 'Paidnice alternative', 'Paidnice pricing', 'AR automation for bookkeepers', 'Xero AR automation for practices'],
});

const DIFFS = [
  {
    icon: Layers,
    label: 'What you pay for',
    collectly: `Client books. $${PLAN_PRICING.growth.monthly}/mo covers ${PRACTICE_INCLUDED_ORGS}, then $${PRACTICE_EXTRA_ORG_MONTHLY} each`,
    competitor: 'Invoice volume, plus $29/mo for every entity after the first',
  },
  {
    icon: FileText,
    label: 'Invoice limits',
    collectly: 'None. A busy month costs the same as a quiet one',
    competitor: 'Capped per tier and shared across all entities: 300 invoices on Pro entry, whether that is one book or ten',
  },
  {
    icon: DollarSign,
    label: 'A single business',
    collectly: `$${PLAN_PRICING.starter.monthly}/mo`,
    competitor: '$69/mo Essentials, or $99/mo Pro, genuinely cheaper here',
  },
  {
    icon: Users,
    label: 'Users',
    collectly: '3 on a single business, unlimited on Practice and above',
    competitor: 'Unlimited on Pro; 2 on Essentials',
  },
  {
    icon: FileText,
    label: 'Approval before sending',
    collectly: 'On by default. Each reminder waits for you, with 30 seconds to undo after you press send. Automatic sending is a per-book choice',
    competitor: 'Also supported: drafts wait for approval, and Safe Mode holds all automatic processing for the whole account',
  },
];

const STRATEGY = [
  {
    title: 'They won the Xero app awards',
    body: 'Xero Global Small Business App of the Year 2025 and 5.0 on the Xero App Store. For a Xero-first buyer, Paidnice is what the marketplace surfaces first, and that is earned distribution rather than marketing spend.',
  },
  {
    title: 'Volume pricing reads cheap at the door',
    body: 'A $69 headline is the easiest number in this market to say out loud. It is also the number a practice stops paying the moment it adds a second client book.',
  },
  {
    title: 'Breadth beyond chasing',
    body: 'Prompt-payment discounts, payment plans and quote reminders, which we do not have. They also run late fees and statements on their own and on a schedule. Ours are reviewed and sent by you, and our late fees are not added to the payment page or written back to your accounting software. If you want levers other than reminders, they have more of them than we do.',
  },
  {
    title: 'Per-entity, not per-practice',
    body: 'Entities are an add-on rather than the unit of pricing, which is coherent for a single business and gets expensive for someone whose whole job is running many books.',
  },
];

const CHOOSE_US = [
  { label: `You run more than about a dozen client books with a normal invoice load (about 30 a month each); with fewer invoices per book the flip comes later` },
  { label: 'You want one predictable number per month, not a bill that moves with invoice volume' },
  { label: 'A busy month should not cost more than a quiet one' },
  { label: 'You want consolidated AR across every client book in one view' },
];

const CHOOSE_THEM = [
  { label: 'You are one business chasing your own invoices, they are cheaper, straightforwardly' },
  { label: 'You run a handful of books and your invoice volume is low and steady' },
  { label: 'You want prompt-payment discounts or payment plans, or late fees and statements that run on their own, as well as chasing' },
  { label: 'You would rather buy the tool the Xero App Store ranks first' },
];

export default function VsPaidnicePage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(comparisonFaqJsonLd('paidnice')) }}
      />
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Compare', path: '/compare' },
          { name: 'vs Paidnice', path: '/vs-paidnice' },
        ]}
      />
      <MarketingHeader />
      <ComparisonHero
        title="Mugavi vs Paidnice"
        subtitle={`Paidnice is a good product and, for a single business, a cheaper one. The difference is what you are charged for: they price invoice volume and add $${PAIDNICE_ENTITY_MONTHLY} a month per extra entity, we price the client book. Below about a dozen books they cost less. Above it we do, and the gap widens fast.`}
        competitorName="Paidnice"
      />
      <ComparisonChecked competitor="Paidnice" date="2026-10-03" source="paidnice.com/pricing" href="https://www.paidnice.com/pricing" />
      <ComparisonDiffGrid diffs={DIFFS} competitorName="Paidnice" />

      <section className="container-page py-14 max-w-3xl">
        <h2 id="cost" className="h2">What would you pay?</h2>
        <p className="mt-3 app-body text-ink-600">
          Put in your own numbers. The invoice count matters: Paidnice prices by invoice volume, so a practice whose
          books send few invoices stays cheaper there for longer. At 30 invoices per book a month we become cheaper
          from {CROSSOVER_30} books; at 10 a month, from {CROSSOVER_10}.
        </p>
        <div className="mt-6">
          <PracticeCostCalculator prices={MUGAVI_PRICES} checkedOn="2026-10-03" />
        </div>
      </section>

      <section className="container-page pb-14 max-w-3xl">
        <h2 className="h2">The arithmetic, both ways</h2>
        <p className="mt-3 app-body text-ink-600">
          Paidnice&apos;s published Pro rate for the invoice volume (Essentials, $69, for one business under 150 invoices), plus ${PAIDNICE_ENTITY_MONTHLY}/mo for each entity
          after the first. Ours is ${PLAN_PRICING.growth.monthly}/mo for {PRACTICE_INCLUDED_ORGS} books, then $
          {PRACTICE_EXTRA_ORG_MONTHLY} each, capped at ${PLAN_PRICING.scale.monthly}/mo for up to{' '}
          {PRACTICE_SCALE_INCLUDED_ORGS}. Assumes 30 invoices per book per month.
        </p>
        <div className="mt-6 panel overflow-x-auto">
          <table className="app-table w-full">
            <thead>
              <tr>
                <th className="text-left">Client books</th>
                <th className="text-right">Paidnice</th>
                <th className="text-right">Mugavi</th>
                <th className="text-right">Cheaper</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.books}>
                  <td>{r.books}</td>
                  <td className="text-right tabular-nums">{r.them === null ? 'Custom quote' : `$${r.them}`}</td>
                  <td className="text-right tabular-nums">${r.us}</td>
                  <td className={`text-right font-medium ${r.cheaper === 'Mugavi' ? 'text-success-700' : 'text-ink-600'}`}>
                    {r.cheaper}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 app-meta">
          Paidnice figures from paidnice.com/pricing, re-read 2026-10-03. Their invoice allowance is shared across
          entities, so a practice hits the next tier sooner than the same invoice count in one book would.
          Check their current pricing before deciding. We would rather you did.
        </p>
      </section>

      <CompetitorGrowthStrategy
        competitorName="Paidnice"
        summary="Paidnice grew through the Xero App Store with a low headline price and a broad set of collection levers."
        cards={STRATEGY}
        takeaway="If you are one business, buy Paidnice. We are not going to pretend $79 beats $69. The case for us starts when client books become the thing you have a lot of, because that is the axis we price on and the one they bill as an add-on."
      />
      <WhenToChoose competitorName="Paidnice" chooseCollectly={CHOOSE_US} chooseCompetitor={CHOOSE_THEM} />
      <ComparisonCta
        headline="Priced for the practice, not the invoice"
        body="14-day free trial, full Practice-tier access, no credit card. Connect Xero and see what Mugavi would send your clients' customers before you turn anything on."
      />
      <MarketingFooter />
    </div>
  );
}
