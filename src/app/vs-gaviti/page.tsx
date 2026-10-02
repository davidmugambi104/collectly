import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import {
  ComparisonHero,
  ComparisonDiffGrid,
  CompetitorGrowthStrategy,
  WhenToChoose,
  ComparisonCta, ComparisonChecked } from '@/components/marketing/comparison-section';
import { DollarSign, Clock, ShieldCheck, Target } from 'lucide-react';
import { pageMetadata, comparisonFaqJsonLd } from '@/lib/seo';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import { PLAN_PRICING } from '@/lib/utils';

export const metadata = pageMetadata({
  title: 'Mugavi vs Gaviti: SMB AR automation without enterprise complexity',
  description:
    'Gaviti is AI-powered invoice-to-cash for mid-market and enterprise. ' +
    'Mugavi is the simple, transparent, self-serve alternative for ' +
    `small B2B service businesses starting at $${PLAN_PRICING.starter.monthly}/mo.`,
  path: '/vs-gaviti',
  keywords: ['Mugavi vs Gaviti', 'Gaviti alternative', 'AR automation', 'Gaviti vs Mugavi'],
});

const DIFFS = [
  { icon: DollarSign, label: 'Price', collectly: `$${PLAN_PRICING.starter.monthly}/mo, public pricing`, competitor: 'Custom pricing, request a quote' },
  { icon: Clock, label: 'Setup', collectly: 'Self-serve, no demo call', competitor: 'No timeline published; request a quote' },
  { icon: ShieldCheck, label: 'Focus', collectly: 'AR dunning + cashflow for SMBs', competitor: 'Full invoice-to-cash + credit + deductions' },
  { icon: Target, label: 'Best for', collectly: '5-30 person agencies and consultancies', competitor: 'Finance teams with an ERP; no size stated on their site' },
];

const STRATEGY = [
  { title: 'ROI-first sales motion', body: 'Gaviti leads with an embedded ROI calculator and case-study proof to justify enterprise deals.' },
  { title: 'Quote-based pricing', body: 'Gaviti publishes no prices and sends you to a quote form, which suits a finance team running a procurement process.' },
  { title: 'Credit + deductions modules', body: 'Gaviti bundles credit risk and dispute management, making it a platform, not a point tool.' },
  { title: 'Analyst and event marketing', body: 'Heavy presence at finance events and analyst reports builds enterprise trust.' },
];

const CHOOSE_US = [
  { label: 'You want transparent, public pricing' },
  { label: 'You use Xero (QuickBooks in beta), not NetSuite/SAP' },
  { label: 'You need tone-aware AI dunning, not just workflows' },
  { label: 'You want self-serve setup, not a sales cycle' },
];

const CHOOSE_THEM = [
  { label: 'You need credit management and dispute workflows' },
  { label: 'You have a dedicated finance/IT implementation team' },
  { label: 'You want unlimited users and custom permissions' },
  { label: 'You process 10,000+ invoices/month across multiple entities' },
];

export default function VsGavitiPage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(comparisonFaqJsonLd('gaviti')) }}
      />
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Compare', path: '/compare' },
          { name: 'vs Gaviti', path: '/vs-gaviti' },
        ]}
      />
      <MarketingHeader />
      <ComparisonHero
        title="Mugavi vs Gaviti"
        subtitle={`Gaviti is a powerful invoice-to-cash platform built for mid-market and enterprise finance teams. Mugavi takes the parts that matter most to small B2B services (smart dunning, cash-flow forecasting, and risk scoring) and packages them in a $${PLAN_PRICING.starter.monthly}/mo tool you can set up before you turn anything on.`}
        competitorName="Gaviti"
      />
      <ComparisonChecked competitor="Gaviti" date="2026-10-02" source="gaviti.com" href="https://www.gaviti.com" note="Gaviti does not publish prices." />
      <ComparisonDiffGrid diffs={DIFFS} competitorName="Gaviti" />
        {/* No table: this competitor is outside the matrix's scope (see
            comparison-table.tsx), so rendering it here would fill the page
            with a comparison that never mentions them. */}
      <CompetitorGrowthStrategy
        competitorName="Gaviti"
        summary="Gaviti grew by selling a full invoice-to-cash platform to finance leaders who needed credit, deductions, and collections in one place."
        cards={STRATEGY}
        takeaway="Gaviti publishes no prices and sends you to a quote and a demo, which fits a finance team with a controller who will run it. If you are a small team that wants to see a price and start today, that is a lot of process for a modest AR problem."
      />
      <WhenToChoose competitorName="Gaviti" chooseCollectly={CHOOSE_US} chooseCompetitor={CHOOSE_THEM} />
      <ComparisonCta
        headline="Enterprise power without enterprise pain"
        body="Start your 14-day free trial. No credit card. Connect Xero and see Mugavi's drafts for your own overdue invoices (QuickBooks integration is in beta)."
      />
      <MarketingFooter />
    </div>
  );
}
