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
import { Bot, DollarSign, Layers, Target } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';

export const metadata = pageMetadata({
  title: 'Collectly vs Zoho Books — AR automation beyond bookkeeping',
  description:
    'Zoho Books is a solid accounting suite with light invoicing and ' +
    'payment reminders. Collectly adds AI tone-aware dunning, AR aging, ' +
    'cash-flow forecasting, and risk scoring for businesses that need ' +
    'real collections automation.',
  path: '/vs-zohobooks',
  keywords: ['Collectly vs Zoho Books', 'Zoho Books alternative', 'Zoho AR', 'Zoho Books vs Collectly'],
});

const DIFFS = [
  { icon: Bot, label: 'Collections AI', collectly: 'Tone-aware email + SMS dunning', competitor: 'Basic invoice reminders' },
  { icon: Layers, label: 'AR depth', collectly: 'Aging, forecast, risk score, branded portal', competitor: 'Invoicing + payment tracking inside Zoho suite' },
  { icon: DollarSign, label: 'Pricing', collectly: '$49/mo flat, no hidden fees', competitor: 'Tiered accounting plans, per-org pricing' },
  { icon: Target, label: 'Best for', collectly: 'Agencies and consultancies focused on reducing DSO', competitor: 'Small businesses that want one Zoho suite' },
];

const STRATEGY = [
  { title: 'Zoho ecosystem bundling', body: 'Zoho Books grew as part of the broader Zoho suite — CRM, Projects, Inventory, and People — making it sticky for SMBs already in the ecosystem.' },
  { title: 'Affordable accounting entry point', body: 'A low starting price and generous free tier made Zoho Books attractive to cost-sensitive small businesses.' },
  { title: 'Global SMB focus', body: 'Strong localization and multi-currency support won international micro-businesses.' },
  { title: 'DIY onboarding', body: 'Self-serve setup and extensive docs made Zoho Books popular with founders who handle their own books.' },
];

const CHOOSE_US = [
  { label: 'Late invoices and unpredictable cash flow are your main pain' },
  { label: 'You want AI to write escalating follow-ups automatically' },
  { label: 'You need cash-flow forecasting and customer risk scoring' },
  { label: 'You want a branded payment portal for customer experience' },
];

const CHOOSE_THEM = [
  { label: 'You want one accounting + CRM + inventory suite' },
  { label: 'You are already invested in the Zoho ecosystem' },
  { label: 'Your AR needs are simple and occasional' },
  { label: 'You prefer a single vendor for multiple business apps' },
];

export default function VsZohobooksPage() {
  return (
    <div className="min-h-screen">
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Compare', path: '/compare' },
          { name: 'vs Zoho Books', path: '/vs-zohobooks' },
        ]}
      />
      <MarketingHeader />
      <ComparisonHero
        title="Collectly vs Zoho Books"
        subtitle="Zoho Books is a capable accounting suite with light invoicing and reminders. Collectly is the AR specialist layer that turns overdue invoices into predictable cash — with AI dunning, forecasting, and risk scoring."
        competitorName="Zoho Books"
      />
      <ComparisonDiffGrid diffs={DIFFS} competitorName="Zoho Books" />
      <ComparisonFullTable />
      <CompetitorGrowthStrategy
        competitorName="Zoho Books"
        summary="Zoho Books grew as the affordable accounting hub inside the broader Zoho ecosystem, popular with cost-sensitive international SMBs."
        cards={STRATEGY}
        takeaway="Zoho Books wins on breadth and price. Collectly wins on AR depth and customer experience — and should target Zoho users whose cash-flow pain has outgrown the suite's shallow reminders."
      />
      <WhenToChoose competitorName="Zoho Books" chooseCollectly={CHOOSE_US} chooseCompetitor={CHOOSE_THEM} />
      <ComparisonCta
        headline="Turn Zoho invoices into faster payments"
        body="Start your 14-day free trial. No credit card. See what Collectly would send your customers in 10 minutes."
      />
      <MarketingFooter />
    </div>
  );
}
