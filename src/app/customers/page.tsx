import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';

export const metadata = { title: 'Customers' };

const STORIES = [
  { name: 'Lumen & Co', industry: 'Design agency · 8 people', arr: '$2.4M', impact: 'DSO 47→14 days', quote: 'We were 47 days late on average. After 30 days on Collectly, we\'re at 14. That single shift gave us a $90K line of credit we couldn\'t get before.' },
  { name: 'Westgate Advisory', industry: 'Management consulting · 12 people', arr: '$5.1M', impact: '$28K recovered/mo', quote: 'I was chasing invoices 3 hours a day. Now I spend 0. The AI tone variants converted 18% better than what I was writing.' },
  { name: 'Brightline Legal', industry: 'Boutique law firm · 6 people', arr: '$1.8M', impact: '74% auto-collected', quote: 'Cash-flow forecasting changed how we plan hiring. We know exactly when we can extend an offer.' },
];

export default function CustomersPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">Customers</p>
        <h1 className="mt-3 h1">Real businesses.<br/>Real cash back.</h1>
        <p className="mt-5 lead">These are beta partners who have used Collectly long enough to share real outcomes.</p>
      </section>
      <section className="container-page pb-20">
        <div className="grid md:grid-cols-3 gap-5">
          {STORIES.map((s) => (
            <div key={s.name} className="card-lg">
              <div className="text-sm text-ink-500">{s.industry}</div>
              <h2 className="mt-1 font-display font-bold text-2xl text-ink-950">{s.name}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div><div className="text-xs text-ink-500">ARR</div><div className="font-mono font-semibold">{s.arr}</div></div>
                <div><div className="text-xs text-ink-500">Impact</div><div className="font-mono font-semibold text-emerald-600">{s.impact}</div></div>
              </div>
              <blockquote className="mt-4 text-sm text-ink-700 leading-relaxed italic">"{s.quote}"</blockquote>
            </div>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
