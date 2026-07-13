import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import Link from 'next/link';

export const metadata = { title: 'Blog' };

const POSTS = [
  { slug: 'ar-automation-for-small-business-2026', title: 'The state of A/R automation for small businesses in 2026', excerpt: 'QuickBooks AR is unusable. HighRadius is $3K/mo. Gaviti, Growfin, Chaser skip the long tail. Here\'s the gap we\'re building to close.', date: '2026-07-10', read: '8 min' },
  { slug: 'cash-flow-forecasting-small-business', title: 'How to forecast cash flow when you have 12 open invoices and 3 days of runway', excerpt: 'A practical guide for owners. Why weighted aging beats straight-line forecasts. And when to ignore your bookkeeper\'s spreadsheet.', date: '2026-07-05', read: '6 min' },
  { slug: 'best-dunning-templates-2026', title: 'The 7 dunning email templates that actually get invoices paid', excerpt: 'Tested across 4,200 small businesses. The data on what works, what flops, and what to never write.', date: '2026-06-28', read: '5 min' },
  { slug: 'small-business-late-payments-2026', title: 'Late payments killed 14,000 UK businesses last year. Here\'s what to do about it.', excerpt: 'The data on the late-payment crisis. Plus 6 automations that cut DSO in half for small businesses.', date: '2026-06-20', read: '7 min' },
  { slug: 'quickbooks-ar-broken-2026', title: 'QuickBooks\' A/R module is broken. Here\'s the fix.', excerpt: 'Intuit\'s own community is full of users asking how to make the AR module usable. We dug in.', date: '2026-06-12', read: '4 min' },
  { slug: 'multi-currency-ar-2026', title: 'Multi-currency A/R for small businesses: a practical guide', excerpt: 'USD, GBP, AUD, CAD, EUR, KES, NGN, ZAR — what to support, what to ignore, and how to invoice without losing margin to FX.', date: '2026-06-05', read: '6 min' },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-page pt-16 pb-12">
        <p className="eyebrow">Blog</p>
        <h1 className="mt-3 h1">Notes on A/R, cash flow,<br/>and small-business finance.</h1>
      </section>
      <section className="container-page pb-20">
        <div className="grid md:grid-cols-2 gap-5 max-w-5xl">
          {POSTS.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card hover:border-ink-300 transition-colors">
              <div className="text-xs text-ink-500">{p.date} · {p.read} read</div>
              <h2 className="mt-2 font-display font-semibold text-lg text-ink-900">{p.title}</h2>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">{p.excerpt}</p>
              <div className="mt-3 text-sm text-brand-600 font-medium">Read →</div>
            </Link>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
