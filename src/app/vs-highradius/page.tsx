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
import { Layers, Clock, Globe2, Target } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';

export const metadata = pageMetadata({
  title: 'Collectly vs HighRadius — SMB AR vs autonomous enterprise finance',
  description:
    'HighRadius builds autonomous finance for the Office of the CFO. ' +
    'Collectly is the simple, AR-native alternative for small agencies ' +
    'and consultancies on Xero starting at $49/mo flat.',
  path: '/vs-highradius',
  keywords: ['Collectly vs HighRadius', 'HighRadius alternative', 'enterprise AR alternative', 'HighRadius vs Collectly'],
});

const DIFFS = [
  { icon: Layers, label: 'Scope', collectly: 'AR dunning, portal, forecast, risk scoring', competitor: 'O2C + AP + Treasury + Close/Reconciliation' },
  { icon: Clock, label: 'Deployment', collectly: '10-minute self-serve setup', competitor: 'Enterprise implementation + change management' },
  { icon: Globe2, label: 'Integrations', collectly: 'Xero, Plaid, Paystack (live); QuickBooks (beta); Stripe/Square (test/sandbox)', competitor: 'SAP, Oracle, MS Dynamics, NetSuite' },
  { icon: Target, label: 'Best for', collectly: '5-30 person agencies and consultancies', competitor: 'Large enterprises / Office of the CFO' },
];

const STRATEGY = [
  { title: 'AI-agent narrative', body: '190+ autonomous finance agents positioned as a platform shift for the CFO office.' },
  { title: 'Event + analyst presence', body: 'HighRadius uses conferences, analyst reports, and thought leadership to build enterprise credibility.' },
  { title: 'Outcome-based selling', body: 'Case studies focus on DSO reduction and working-capital impact, not features.' },
  { title: 'Suite bundling', body: 'O2C, AP, Treasury, and R2R make it hard to displace once implemented.' },
];

const CHOOSE_US = [
  { label: 'You want AR automation, not a full finance transformation' },
  { label: 'You need to go live this week, not next quarter' },
  { label: 'You use Xero (or QuickBooks in beta) and want a plug-in collections layer' },
  { label: 'You want transparent flat pricing' },
];

const CHOOSE_THEM = [
  { label: 'You are a large enterprise with a dedicated transformation budget' },
  { label: 'You need AP, Treasury, and Close automation alongside AR' },
  { label: 'You run SAP/Oracle/NetSuite and want deep ERP integration' },
  { label: 'You have months for implementation and change management' },
];

export default function VsHighradiusPage() {
  return (
    <div className="min-h-screen">
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Compare', path: '/compare' },
          { name: 'vs HighRadius', path: '/vs-highradius' },
        ]}
      />
      <MarketingHeader />
      <ComparisonHero
        title="Collectly vs HighRadius"
        subtitle="HighRadius is the ceiling of autonomous enterprise finance. Collectly is the floor that small B2B services actually need: smart AR follow-up, a branded payment portal, and a cash-flow forecast — live in 10 minutes at $49/mo."
        competitorName="HighRadius"
      />
      <ComparisonDiffGrid diffs={DIFFS} competitorName="HighRadius" />
      <ComparisonFullTable />
      <CompetitorGrowthStrategy
        competitorName="HighRadius"
        summary="HighRadius grew by selling a complete autonomous finance platform to CFOs who wanted one vendor for O2C, AP, Treasury, and Close."
        cards={STRATEGY}
        takeaway="HighRadius proves the value of AI in AR, but at enterprise scale and speed. Collectly can deliver the same promise to SMBs without the implementation overhead."
      />
      <WhenToChoose competitorName="HighRadius" chooseCollectly={CHOOSE_US} chooseCompetitor={CHOOSE_THEM} />
      <ComparisonCta
        headline="Big-company AI, small-company speed"
        body="Start your 14-day free trial. No credit card. See what Collectly would send your customers in 10 minutes."
      />
      <MarketingFooter />
    </div>
  );
}
