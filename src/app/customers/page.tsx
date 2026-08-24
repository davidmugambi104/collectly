import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Customer outcomes — agencies and consultancies on Collectly',
  description:
    'We don\'t publish polished case studies until we have enough customers ' +
    'to mean something. Here\'s how the founding cohort is using Collectly ' +
    'on Xero and QuickBooks — what they\'re trying to do, what we expect ' +
    'to see, and what we will and won\'t claim.',
  path: '/customers',
  keywords: [
    'Collectly customers',
    'Xero customer outcomes',
    'small agency AR results',
    'founding cohort results',
  ],
});

const SCENARIOS = [
  { industry: 'Design agency · 8 people · Xero', target: 'Cut average days-late from 47 toward 14 within 30 days of consistent approve-and-send follow-up.' },
  { industry: 'Management consultancy · 12 people · QuickBooks', target: 'Move first-touch reminders off a founder\'s plate by putting approve-and-send dunning on autopilot.' },
  { industry: 'Boutique law firm · 6 people · Xero', target: 'See 4 weeks out which invoices will convert to cash, for hiring and cash-flow planning.' },
];

export default function CustomersPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">Customers</p>
        <h1 className="mt-3 h1">What Collectly is<br/>built to do.</h1>
        <p className="mt-5 lead">We&apos;re pre-launch with no customers yet, so we have no verified results to publish. Below are the outcomes we&apos;re building toward — not testimonials. Real, named case studies with permission are coming once our first founding customers have a full quarter of data.</p>
      </section>
      <section className="container-page pb-20">
        <div className="grid md:grid-cols-3 gap-5">
          {SCENARIOS.map((s) => (
            <div key={s.industry} className="card-lg">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-400">Illustrative target</div>
              <h2 className="mt-2 font-display font-bold text-lg text-ink-950">{s.industry}</h2>
              <p className="mt-4 text-sm text-ink-700 leading-relaxed">{s.target}</p>
            </div>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
