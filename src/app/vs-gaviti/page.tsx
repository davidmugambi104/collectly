import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import {
  ComparisonHero,
  ComparisonDiffGrid,
  ComparisonFullTable,
  CompetitorGrowthStrategy,
  WhenToChoose,
  ComparisonCta,
} from '@/components/marketing/comparison-section';
import { DollarSign, Clock, ShieldCheck, Target } from 'lucide-react';

export const metadata = {
  title: 'Collectly vs Gaviti — SMB AR automation without enterprise complexity',
  description:
    'Gaviti is AI-powered invoice-to-cash for mid-market and enterprise. Collectly is the simple, transparent, self-serve alternative for small B2B service businesses starting at $49/mo.',
};

const DIFFS = [
  { icon: DollarSign, label: 'Price', collectly: '$49/mo flat, public pricing', competitor: 'Custom pricing, request a quote' },
  { icon: Clock, label: 'Setup', collectly: 'Under 10 minutes', competitor: 'Implementation-led, weeks' },
  { icon: ShieldCheck, label: 'Focus', collectly: 'AR dunning + cashflow for SMBs', competitor: 'Full invoice-to-cash + credit + deductions' },
  { icon: Target, label: 'Best for', collectly: '1–50 person B2B services', competitor: 'Mid-market / enterprise finance teams' },
];

const STRATEGY = [
  { title: 'ROI-first sales motion', body: 'Gaviti leads with an embedded ROI calculator and case-study proof to justify enterprise deals.' },
  { title: 'Usage-based pricing', body: 'No per-user limits makes Gaviti easy to expand inside large finance teams.' },
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
      <MarketingHeader />
      <ComparisonHero
        title="Collectly vs Gaviti"
        subtitle="Gaviti is a powerful invoice-to-cash platform built for mid-market and enterprise finance teams. Collectly takes the parts that matter most to small B2B services — smart dunning, cash-flow forecasting, and risk scoring — and packages them in a $49/mo tool you can set up in 10 minutes."
        competitorName="Gaviti"
      />
      <ComparisonDiffGrid diffs={DIFFS} competitorName="Gaviti" />
      <ComparisonFullTable />
      <CompetitorGrowthStrategy
        competitorName="Gaviti"
        summary="Gaviti grew by selling a full invoice-to-cash platform to finance leaders who needed credit, deductions, and collections in one place."
        cards={STRATEGY}
        takeaway="Gaviti proved companies will pay for AR automation, but only when sold as an enterprise implementation. Collectly can win the long tail with self-serve speed, transparent pricing, and emotional positioning."
      />
      <WhenToChoose competitorName="Gaviti" chooseCollectly={CHOOSE_US} chooseCompetitor={CHOOSE_THEM} />
      <ComparisonCta
        headline="Enterprise power without enterprise pain"
        body="Start your 14-day free trial. No credit card. Connect Xero and see Collectly run in under a minute (QuickBooks integration is in beta)."
      />
      <MarketingFooter />
    </div>
  );
}
