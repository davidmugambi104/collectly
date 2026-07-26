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
import { Bot, Clock, FileText, Target } from 'lucide-react';

export const metadata = {
  title: 'Collectly vs FreshBooks — From simple invoicing to real AR automation',
  description:
    'FreshBooks is easy invoicing for freelancers and small agencies. Collectly adds AI tone-aware dunning, AR aging, cash-flow forecasting, and risk scoring for businesses that have outgrown basic reminders.',
};

const DIFFS = [
  { icon: Bot, label: 'Collections AI', collectly: 'Tone-aware email + SMS dunning', competitor: 'Manual payment reminders' },
  { icon: FileText, label: 'AR depth', collectly: 'Aging, forecast, risk score, portal', competitor: 'Invoicing + basic payment tracking' },
  { icon: Clock, label: 'Time to value', collectly: '< 10 min setup', competitor: 'Already inside FreshBooks, but shallow AR' },
  { icon: Target, label: 'Best for', collectly: 'B2B services serious about cash flow', competitor: 'Freelancers and small service businesses' },
];

const STRATEGY = [
  { title: 'Freelancer-first UX', body: 'FreshBooks won by being easier than QuickBooks for solo operators and small agencies.' },
  { title: 'Simple pricing and free trials', body: 'Transparent plans and a strong free-trial funnel lowered the barrier to first invoice.' },
  { title: 'Service-business positioning', body: 'Marketing focused on designers, agencies, and consultants — exactly the ICP Collectly wants.' },
  { title: 'Product-led expansion', body: 'Time tracking, expenses, and payments kept users inside the platform as they grew.' },
];

const CHOOSE_US = [
  { label: 'You have $100K+ annual invoices and late payments are painful' },
  { label: 'You want AI to handle follow-ups with the right tone' },
  { label: 'You need a 4-week cash-flow forecast to plan payroll' },
  { label: 'You want risk scoring to prioritize who to chase' },
];

const CHOOSE_THEM = [
  { label: 'You are a solo freelancer with simple invoicing needs' },
  { label: 'You want time tracking, expenses, and invoices in one tool' },
  { label: 'You rarely have overdue invoices' },
  { label: 'You prefer an all-in-one accounting tool over best-of-breed AR' },
];

export default function VsFreshbooksPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <ComparisonHero
        title="Collectly vs FreshBooks"
        subtitle="FreshBooks makes invoicing simple. But when your invoices start going overdue and cash flow gets unpredictable, you need more than reminders. Collectly adds AI dunning, forecasting, and risk scoring while keeping your accounting workflow intact."
        competitorName="FreshBooks"
      />
      <ComparisonDiffGrid diffs={DIFFS} competitorName="FreshBooks" />
      <ComparisonFullTable />
      <CompetitorGrowthStrategy
        competitorName="FreshBooks"
        summary="FreshBooks grew by owning the freelancer-to-small-agency invoicing workflow and expanding into accounting, time tracking, and payments."
        cards={STRATEGY}
        takeaway="FreshBooks owns the same service-business ICP but stops at basic invoicing. Collectly should intercept users as they outgrow simple reminders."
      />
      <WhenToChoose competitorName="FreshBooks" chooseCollectly={CHOOSE_US} chooseCompetitor={CHOOSE_THEM} />
      <ComparisonCta
        headline="Outgrown FreshBooks reminders?"
        body="Start your 14-day free trial. No credit card. Connect your books and see what Collectly would send your customers."
      />
      <MarketingFooter />
    </div>
  );
}
