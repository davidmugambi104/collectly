import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import {
  ComparisonHero,
  ComparisonDiffGrid,
  CompetitorGrowthStrategy,
  WhenToChoose,
  ComparisonCta,
} from '@/components/marketing/comparison-section';
import { DollarSign, Clock, Building2, Target } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import { PLAN_PRICING } from '@/lib/utils';

/**
 * Facts about Upflow on this page come from upflow.io, read 2026-09-20, and
 * their claims are attributed to them rather than restated as ours. Their
 * pricing is not published anywhere on their site, and third-party listings
 * disagree with each other (roughly $249 to $500+/mo, ARR-based tiers), so
 * this page says exactly that instead of picking a number and asserting it.
 */
export const metadata = pageMetadata({
  title: 'Mugavi vs Upflow — published pricing for teams without a finance department',
  description:
    'Upflow is a Financial Relationship Management platform for B2B finance ' +
    'teams, with collections, payments and cash application — and pricing you ' +
    'have to book a demo to learn. Mugavi does AR chasing for 5-30 person ' +
    `agencies on Xero at a published $${PLAN_PRICING.starter.monthly}/mo.`,
  path: '/vs-upflow',
  keywords: ['Mugavi vs Upflow', 'Upflow alternative', 'Upflow pricing', 'Upflow vs Mugavi', 'AR automation for small agencies'],
});

const DIFFS = [
  {
    icon: DollarSign,
    label: 'Pricing',
    collectly: `Published: $${PLAN_PRICING.starter.monthly}/mo, flat, no per-invoice fees`,
    competitor: 'Not published — demo required. Third-party listings range from ~$249 to $500+/mo, on ARR-based tiers',
  },
  {
    icon: Target,
    label: 'Built for',
    collectly: '5-30 person agencies and consultancies with no AR function',
    competitor: 'B2B finance teams — their site names CFOs, Controllers and AR Managers',
  },
  {
    icon: Building2,
    label: 'Scope',
    collectly: 'AR chasing, done properly: dunning, promises, risk, forecast',
    competitor: 'Four products — Insights, Collections, Payments and Cash App reconciliation',
  },
  {
    icon: Clock,
    label: 'Getting started',
    collectly: 'Self-serve, under 10 minutes, 14-day free trial',
    competitor: 'Book a demo, or a free analytics-only tier',
  },
];

const STRATEGY = [
  {
    title: 'A category of their own',
    body: 'Upflow markets "Financial Relationship Management" rather than competing inside the crowded AR-automation term. Naming the category is a way to stop being compared on features.',
  },
  {
    title: 'Deep ERP coverage',
    body: 'NetSuite, Sage Intacct, Zuora, Chargebee and Stripe Billing alongside Xero and QuickBooks. That integration list is a statement about who they sell to.',
  },
  {
    title: 'Demo-gated pricing',
    body: 'No price on the site. That works when a CFO is running a procurement process, and works against you when a five-person studio is deciding in a browser tab at 9pm.',
  },
  {
    title: 'Agents with an autonomy dial',
    body: 'Their AI agents run from suggestion-only through to fully autonomous, which lets a finance team adopt gradually rather than hand over collections on day one.',
  },
];

const CHOOSE_US = [
  { label: 'Nobody at your company owns AR — it lands on the founder or the bookkeeper' },
  { label: 'You want to see the price before you talk to anyone' },
  { label: 'You run on Xero and want chasing live this afternoon' },
  { label: 'Your problem is invoices going unchased, not cash application at volume' },
];

const CHOOSE_THEM = [
  { label: 'You have a finance team — a Controller or a dedicated AR Manager' },
  { label: 'You need cash application and reconciliation, not just chasing' },
  { label: 'Your billing runs through NetSuite, Sage Intacct, Zuora or Chargebee' },
  { label: 'You want 12+ payment methods on a B2B payment portal' },
];

export default function VsUpflowPage() {
  return (
    <div className="min-h-screen">
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Compare', path: '/compare' },
          { name: 'vs Upflow', path: '/vs-upflow' },
        ]}
      />
      <MarketingHeader />
      <ComparisonHero
        title="Mugavi vs Upflow"
        subtitle="Upflow is a capable platform built for B2B finance teams — collections, payments and cash application, with AI agents you can dial from suggestion-only to autonomous. It is also demo-gated, and priced for companies that have a Controller. Mugavi does the chasing part, on Xero, for teams where AR is nobody's job."
        competitorName="Upflow"
      />
      <ComparisonDiffGrid diffs={DIFFS} competitorName="Upflow" />
      {/* No table: Upflow sits outside the matrix's scope (see
          comparison-table.tsx), which covers the tools a 5-30 person agency
          actually shortlists. */}
      <CompetitorGrowthStrategy
        competitorName="Upflow"
        summary="Upflow grew by naming its own category and selling into finance teams that already have someone responsible for receivables."
        cards={STRATEGY}
        takeaway="Upflow is the better product if you have a finance function to run it. The honest difference is not features, it is who is on the other end: their site sells to CFOs, Controllers and AR Managers. If your AR is chased by whoever has a spare hour on Friday, you are not the buyer they designed for."
      />
      <WhenToChoose competitorName="Upflow" chooseCollectly={CHOOSE_US} chooseCompetitor={CHOOSE_THEM} />
      <ComparisonCta
        headline="See the price, then decide"
        body="14-day free trial, no credit card, no demo call. Connect Xero and see exactly what Mugavi would send your customers in 10 minutes."
      />
      <MarketingFooter />
    </div>
  );
}
