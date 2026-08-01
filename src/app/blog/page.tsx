import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { WaitlistForm } from '@/components/marketing/waitlist';
import { POSTS } from '@/lib/posts';
import { pageMetadata, breadcrumbJsonLd, SITE } from '@/lib/seo';
import Link from 'next/link';
import { Clock, Tag, Rss } from 'lucide-react';

export const metadata = pageMetadata({
  title: 'Blog — notes on A/R, cash flow & small-business finance',
  description:
    'Real essays on accounts-receivable automation, Xero + QuickBooks workflows, ' +
    'cash-flow forecasting, and small-agency operations. Published by the team ' +
    'building Collectly.',
  path: '/blog',
  keywords: [
    'accounts receivable blog',
    'Xero blog',
    'small business cash flow',
    'AR automation insights',
    'agency operations',
  ],
});

const jsonLd = JSON.stringify(
  breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
  ]),
);

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <MarketingHeader />
      <section className="container-page pt-16 pb-12">
        <p className="eyebrow">Blog</p>
        <h1 className="mt-3 h1">Notes on A/R, cash flow,<br/>and small-business finance.</h1>
        <p className="mt-5 lead max-w-2xl">Real essays, not marketing content. Based on the data we've collected building Collectly and the conversations we've had with hundreds of small business owners.</p>
        <a
          href="/rss.xml"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900"
          rel="alternate"
          type="application/rss+xml"
          aria-label="Collectly blog RSS feed"
        >
          <Rss className="h-3.5 w-3.5" /> RSS feed
        </a>
      </section>
      <section className="container-page pb-20">
        <div className="grid md:grid-cols-2 gap-5 max-w-5xl">
          {POSTS.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card-lg hover:border-ink-300 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3 text-xs text-ink-500">
                <span>{p.date}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.read} read</span>
              </div>
              <h2 className="mt-2 font-display font-semibold text-xl text-ink-900 group-hover:text-brand-600 transition-colors">{p.title}</h2>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">{p.excerpt}</p>
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                {p.tags.map((t) => (
                  <span key={t} className="badge-neutral text-[10px]"><Tag className="h-2.5 w-2.5 mr-0.5" />{t}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="container-page pb-20">
        <div className="card-lg grad-mesh text-center">
          <h2 className="h2">Get the next essay in your inbox</h2>
          <p className="mt-4 lead">1 essay every 2 weeks. No spam, unsubscribe anytime.</p>
          <div className="mt-6 max-w-md mx-auto"><WaitlistForm /></div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
