import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { InterviewForm } from '@/components/marketing/interview-form';

export const metadata = { title: 'Customer interview · Collectly' };

export default function InterviewPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-tight py-16">
        <p className="eyebrow">Customer research</p>
        <h1 className="mt-3 h1">Got 5 minutes?<br/>Help us build the right thing.</h1>
        <p className="mt-5 lead">We're doing 10 customer interviews with founders and finance leads at 5-50 person B2B service businesses. We pay you $25 for your time. No pitch. Just learning.</p>

        <div className="mt-10 card-lg">
          <InterviewForm />
        </div>

        <p className="mt-6 text-xs text-ink-500">Your data is used only for research. We never sell or share it. You can ask us to delete it any time.</p>
      </section>
      <MarketingFooter />
    </div>
  );
}
