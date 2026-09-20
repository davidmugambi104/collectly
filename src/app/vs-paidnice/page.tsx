import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import {
  ComparisonHero,
  ComparisonDiffGrid,
  CompetitorGrowthStrategy,
  WhenToChoose,
  ComparisonCta,
} from '@/components/marketing/comparison-section';
import { DollarSign, Layers, Users, FileText } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import {
  PLAN_PRICING,
  PRACTICE_INCLUDED_ORGS,
  PRACTICE_EXTRA_ORG_MONTHLY,
  PRACTICE_SCALE_INCLUDED_ORGS,
} from '@/lib/utils';

/**
 * Paidnice figures are published at paidnice.com/pricing and were read on
 * 2026-09-20. They are quoted, not estimated, and the arithmetic below is
 * derived from their own two published rates: the Pro tier price for a given
 * monthly invoice volume, and $29/month for each entity beyond the first.
 *
 * The honest finding this page is built on: below roughly a dozen client books
 * Paidnice costs less than we do, and above it we cost less. Saying so is the
 * point -- a practice can check the arithmetic in a minute, and a comparison
 * page that loses that check loses the reader with it.
 */
const PAIDNICE_ENTITY_MONTHLY = 29;
const PAIDNICE_PRO_TIERS: Array<[invoices: number, monthly: number]> = [
  [300, 99],
  [600, 179],
  [1000, 279],
  [2000, 489],
  [3000, 649],
  [4000, 799],
];

/** Paidnice monthly cost for a practice of `books`, at ~30 invoices per book. */
function paidniceMonthly(books: number, invoicesPerBook = 30): number | null {
  const totalInvoices = books * invoicesPerBook;
  const tier = PAIDNICE_PRO_TIERS.find(([cap]) => totalInvoices <= cap);
  if (!tier) return null;
  return tier[1] + PAIDNICE_ENTITY_MONTHLY * (books - 1);
}

/** Our monthly cost for the same practice. */
function mugaviMonthly(books: number): number {
  if (books <= 1) return PLAN_PRICING.starter.monthly;
  if (books <= PRACTICE_INCLUDED_ORGS) return PLAN_PRICING.growth.monthly;
  const onPractice = PLAN_PRICING.growth.monthly + PRACTICE_EXTRA_ORG_MONTHLY * (books - PRACTICE_INCLUDED_ORGS);
  return Math.min(onPractice, PLAN_PRICING.scale.monthly);
}

const ROWS = [1, 5, 10, 15, 20, 30, 50, 100].map((books) => {
  const them = paidniceMonthly(books);
  const us = mugaviMonthly(books);
  return { books, them, us, cheaper: them !== null && them < us ? 'Paidnice' : 'Mugavi' };
});

export const metadata = pageMetadata({
  title: 'Mugavi vs Paidnice — per client book, not per invoice',
  description:
    'Paidnice charges by invoice volume plus $29 per extra entity. Mugavi ' +
    `charges per client book: $${PLAN_PRICING.growth.monthly}/mo for ${PRACTICE_INCLUDED_ORGS} of them. ` +
    'Below about a dozen books Paidnice costs less. Above it we do. The full arithmetic, both ways.',
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
    competitor: 'Capped per tier and shared across all entities — 300 invoices on Pro entry, whether that is one book or ten',
  },
  {
    icon: DollarSign,
    label: 'A single business',
    collectly: `$${PLAN_PRICING.starter.monthly}/mo`,
    competitor: '$69/mo Essentials, or $99/mo Pro — genuinely cheaper here',
  },
  {
    icon: Users,
    label: 'Users',
    collectly: 'Unlimited on Practice and above',
    competitor: 'Unlimited on Pro; 2 on Essentials',
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
    body: 'Late fees, prompt-payment discounts, payment plans, statements and quote reminders. If you want levers other than reminders, they have more of them than we do.',
  },
  {
    title: 'Per-entity, not per-practice',
    body: 'Entities are an add-on rather than the unit of pricing, which is coherent for a single business and gets expensive for someone whose whole job is running many books.',
  },
];

const CHOOSE_US = [
  { label: `You run more than about a dozen client books — the arithmetic flips there` },
  { label: 'You want one predictable number per month, not a bill that moves with invoice volume' },
  { label: 'A busy month should not cost more than a quiet one' },
  { label: 'You want consolidated AR across every client book in one view' },
];

const CHOOSE_THEM = [
  { label: 'You are one business chasing your own invoices — they are cheaper, straightforwardly' },
  { label: 'You run a handful of books and your invoice volume is low and steady' },
  { label: 'You want late fees, prompt-payment discounts and payment plans as well as chasing' },
  { label: 'You would rather buy the tool the Xero App Store ranks first' },
];

export default function VsPaidnicePage() {
  return (
    <div className="min-h-screen">
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
        subtitle={`Paidnice is a good product and, for a single business, a cheaper one. The difference is what you are charged for: they price invoice volume and add $${PAIDNICE_ENTITY_MONTHLY} a month per extra entity, we price the client book. Below about a dozen books they cost less. Above it we do — and the gap widens fast.`}
        competitorName="Paidnice"
      />
      <ComparisonDiffGrid diffs={DIFFS} competitorName="Paidnice" />

      <section className="container-page py-14 max-w-3xl">
        <h2 className="h2">The arithmetic, both ways</h2>
        <p className="mt-3 app-body text-ink-600">
          Paidnice&apos;s published Pro rate for the invoice volume, plus ${PAIDNICE_ENTITY_MONTHLY}/mo for each entity
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
          Paidnice figures from paidnice.com/pricing, read 2026-09-20. Their invoice allowance is shared across
          entities, so a practice hits the next tier sooner than the same invoice count in one book would.
          Check their current pricing before deciding — we would rather you did.
        </p>
      </section>

      <CompetitorGrowthStrategy
        competitorName="Paidnice"
        summary="Paidnice grew through the Xero App Store with a low headline price and a broad set of collection levers."
        cards={STRATEGY}
        takeaway="If you are one business, buy Paidnice. We are not going to pretend $149 beats $69. The case for us starts when client books become the thing you have a lot of, because that is the axis we price on and the one they bill as an add-on."
      />
      <WhenToChoose competitorName="Paidnice" chooseCollectly={CHOOSE_US} chooseCompetitor={CHOOSE_THEM} />
      <ComparisonCta
        headline="Priced for the practice, not the invoice"
        body="14-day free trial, full Practice-tier access, no credit card. Connect Xero and see what Mugavi would send your clients' customers in 10 minutes."
      />
      <MarketingFooter />
    </div>
  );
}
