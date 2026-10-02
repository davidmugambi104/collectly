import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import {
  ComparisonHero,
  ComparisonDiffGrid,
  CompetitorGrowthStrategy,
  WhenToChoose,
  ComparisonCta, ComparisonChecked } from '@/components/marketing/comparison-section';
import { Bot, Clock, Building2, Target } from 'lucide-react';
import { pageMetadata, comparisonFaqJsonLd } from '@/lib/seo';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import { PLAN_PRICING } from '@/lib/utils';

export const metadata = pageMetadata({
  title: 'Mugavi vs Growfin: behavioral AI AR for the rest of us',
  description:
    'Growfin uses behavioral AI for enterprise order-to-cash on NetSuite. ' +
    'Mugavi brings AI tone-aware dunning, cash-flow forecasting, and ' +
    `risk scoring to small agencies and consultancies on Xero at $${PLAN_PRICING.starter.monthly}/mo.`,
  path: '/vs-growfin',
  keywords: ['Mugavi vs Growfin', 'Growfin alternative', 'NetSuite AR alternative', 'Growfin vs Mugavi'],
});

const DIFFS = [
  { icon: Bot, label: 'AI approach', collectly: 'Tone-aware Gemini dunning + risk scoring', competitor: 'Behavioral AI for enterprise collections CRM' },
  { icon: Clock, label: 'Time to value', collectly: 'Self-serve, no demo call', competitor: 'No timeline published; book a demo' },
  { icon: Building2, label: 'Integrations', collectly: 'Xero (live); QuickBooks (beta)', competitor: 'NetSuite (dedicated SuiteApp), Xero, Sage, Zoho Books and other cloud ERPs; Slack and Salesforce' },
  { icon: Target, label: 'Best for', collectly: '5-30 person agencies and consultancies', competitor: 'Enterprise AR managers / controllers' },
];

const STRATEGY = [
  { title: 'NetSuite SuiteApp distribution', body: 'Growfin built deep into NetSuite so finance teams discover it inside the ERP they already live in.' },
  { title: 'Use-case SEO', body: 'Dozens of pages by role, objective, and use-case capture high-intent enterprise search traffic.' },
  { title: 'Behavioral AI narrative', body: '“Health Score” and behavioral signals make AR feel data-science-driven, justifying enterprise ACVs.' },
  { title: 'Slack + Salesforce collaboration', body: 'Embedding collections inside tools sales teams already use drives cross-team adoption.' },
];

const CHOOSE_US = [
  { label: 'You run on Xero (QuickBooks in beta), not NetSuite' },
  { label: 'You want AI-written follow-ups in minutes, not model deployments' },
  { label: 'You need a 4-week cash-flow forecast for planning payroll' },
  { label: 'You prefer flat monthly pricing to enterprise negotiation' },
];

const CHOOSE_THEM = [
  { label: 'You are an enterprise with NetSuite as your source of truth' },
  { label: 'You need a collections CRM integrated with Salesforce' },
  { label: 'You have data-science resources to tune behavioral models' },
  { label: 'You process complex deductions and cash application at scale' },
];

export default function VsGrowfinPage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(comparisonFaqJsonLd('growfin')) }}
      />
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Compare', path: '/compare' },
          { name: 'vs Growfin', path: '/vs-growfin' },
        ]}
      />
      <MarketingHeader />
      <ComparisonHero
        title="Mugavi vs Growfin"
        subtitle="Growfin brings behavioral AI to enterprise order-to-cash on NetSuite. Mugavi brings the AI parts that actually matter to small B2B services (tone-aware dunning, cash-flow forecasting, and customer risk scoring) without the ERP implementation."
        competitorName="Growfin"
      />
      <ComparisonChecked competitor="Growfin" date="2026-10-02" source="growfin.ai" href="https://www.growfin.ai" note="Growfin does not publish prices." />
      <ComparisonDiffGrid diffs={DIFFS} competitorName="Growfin" />
        {/* No table: this competitor is outside the matrix's scope (see
            comparison-table.tsx), so rendering it here would fill the page
            with a comparison that never mentions them. */}
      <CompetitorGrowthStrategy
        competitorName="Growfin"
        summary="Growfin grew by becoming the behavioral AI collections layer for NetSuite-driven enterprises."
        cards={STRATEGY}
        takeaway="Growfin is built for a finance team with a dedicated AR function and a NetSuite-shaped stack. If you have neither, a demo-led enterprise tool is probably more than you need."
      />
      <WhenToChoose competitorName="Growfin" chooseCollectly={CHOOSE_US} chooseCompetitor={CHOOSE_THEM} />
      <ComparisonCta
        headline="AI collections without the enterprise hangover"
        body="Start your 14-day free trial. No credit card. See exactly what Mugavi would send your customers before you turn anything on."
      />
      <MarketingFooter />
    </div>
  );
}
