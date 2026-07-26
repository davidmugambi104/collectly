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
import { Bot, Clock, Building2, Target } from 'lucide-react';

export const metadata = {
  title: 'Collectly vs Growfin — Behavioral AI AR for the rest of us',
  description:
    'Growfin uses behavioral AI for enterprise order-to-cash on NetSuite. Collectly brings AI tone-aware dunning, cash-flow forecasting, and risk scoring to small B2B service businesses on QBO/Xero at $49/mo.',
};

const DIFFS = [
  { icon: Bot, label: 'AI approach', collectly: 'Tone-aware Gemini dunning + risk scoring', competitor: 'Behavioral AI for enterprise collections CRM' },
  { icon: Clock, label: 'Time to value', collectly: '< 1 day, self-serve', competitor: 'Months (ERP implementation)' },
  { icon: Building2, label: 'Integrations', collectly: 'QBO, Xero, Stripe, Square, Plaid', competitor: 'NetSuite, Salesforce, major ERPs' },
  { icon: Target, label: 'Best for', collectly: 'Small B2B services (1–50 people)', competitor: 'Enterprise AR managers / controllers' },
];

const STRATEGY = [
  { title: 'NetSuite SuiteApp distribution', body: 'Growfin built deep into NetSuite so finance teams discover it inside the ERP they already live in.' },
  { title: 'Use-case SEO', body: 'Dozens of pages by role, objective, and use-case capture high-intent enterprise search traffic.' },
  { title: 'Behavioral AI narrative', body: '“Health Score” and behavioral signals make AR feel data-science-driven, justifying enterprise ACVs.' },
  { title: 'Slack + Salesforce collaboration', body: 'Embedding collections inside tools sales teams already use drives cross-team adoption.' },
];

const CHOOSE_US = [
  { label: 'You run on QBO or Xero, not NetSuite' },
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
      <MarketingHeader />
      <ComparisonHero
        title="Collectly vs Growfin"
        subtitle="Growfin brings behavioral AI to enterprise order-to-cash on NetSuite. Collectly brings the AI parts that actually matter to small B2B services — tone-aware dunning, cash-flow forecasting, and customer risk scoring — without the ERP implementation."
        competitorName="Growfin"
      />
      <ComparisonDiffGrid diffs={DIFFS} competitorName="Growfin" />
      <ComparisonFullTable />
      <CompetitorGrowthStrategy
        competitorName="Growfin"
        summary="Growfin grew by becoming the behavioral AI collections layer for NetSuite-driven enterprises."
        cards={STRATEGY}
        takeaway="Growfin's enterprise playbook is heavy and slow. Collectly can deliver 80% of the AR value in a self-serve product built for the QBO/Xero long tail."
      />
      <WhenToChoose competitorName="Growfin" chooseCollectly={CHOOSE_US} chooseCompetitor={CHOOSE_THEM} />
      <ComparisonCta
        headline="AI collections without the enterprise hangover"
        body="Start your 14-day free trial. No credit card. See exactly what Collectly would send your customers in 10 minutes."
      />
      <MarketingFooter />
    </div>
  );
}
