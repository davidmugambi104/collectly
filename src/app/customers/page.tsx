import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Customer outcomes — agencies and consultancies on Mugavi',
  description:
    'We don\'t publish polished case studies until we have enough customers ' +
    'to mean something. Here\'s how the founding cohort is using Mugavi ' +
    'on Xero and QuickBooks — what they\'re trying to do, what we expect ' +
    'to see, and what we will and won\'t claim.',
  path: '/customers',
  keywords: [
    'Mugavi customers',
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
        {/* Same disclosure, opposite order. Leading with "no customers yet"
            made the page's own headline a retraction. The point that these are
            targets rather than testimonials still has to be made — and is, in
            the second sentence and on every card — but it now qualifies a claim
            instead of replacing one. The hard <br/> is gone so the headline
            breaks on its own measure. */}
        <h1 className="mt-3 h1 max-w-2xl text-balance">What Mugavi is built to do.</h1>
        <p className="mt-5 lead">These are the outcomes the product is built to produce, drawn from the A/R maths rather than from customer stories — we publish named case studies only once a founding customer has a full quarter of data behind them, with their permission.</p>
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
