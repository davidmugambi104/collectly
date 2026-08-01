import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { InterviewForm } from '@/components/marketing/interview-form';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Customer interview — share your A/R workflow',
  description:
    '15-minute customer-interview call about how you currently chase ' +
    'overdue invoices, what works, and what does not. Founding-cohort ' +
    'participants get 3 months free.',
  path: '/interview',
  keywords: ['Collectly customer interview', 'AR workflow interview', 'founding cohort'],
});

export default function InterviewPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-tight py-16">
        <p className="eyebrow">Customer research</p>
        <h1 className="mt-3 h1">What was the last invoice you had to chase?</h1>
        <p className="mt-5 lead">We're doing 10 short customer interviews with founders and finance leads at 5-30 person agencies and consultancies. We pay you $25 for your time. No pitch — just 10 questions about how late-payment follow-up actually works for you.</p>

        <div className="mt-10 card-lg">
          <InterviewForm />
        </div>

        <p className="mt-6 text-xs text-ink-500">Your data is used only for research. We never sell or share it. You can ask us to delete it any time.</p>
      </section>
      <MarketingFooter />
    </div>
  );
}
