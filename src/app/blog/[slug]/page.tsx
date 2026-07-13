import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const POSTS: Record<string, { title: string; date: string; read: string; body: string }> = {
  'ar-automation-for-small-business-2026': {
    title: 'The state of A/R automation for small businesses in 2026',
    date: '2026-07-10', read: '8 min',
    body: `The 5-50 person business segment is the most underserved part of the $4-6B accounts-receivable automation market. Here's the data.

The numbers don't lie:
- 56% of small businesses are owed money on unpaid invoices (QuickBooks, 2025)
- Average $17,500 per business in unpaid invoices
- 47% have invoices overdue 30+ days
- 40% of owners name bookkeeping & taxes the single worst part of owning a business (SCORE)

And the tools don't fit:
- HighRadius: $3,000+/month, 6+ weeks implementation, built for the Fortune 500
- Gaviti, Growfin, Chaser, Tesorio: $500+/month floor, mid-market focus
- QuickBooks' built-in AR module: widely hated by users (Intuit's own community is full of complaints)

The gap: nobody is building for the 5-50 person business. That's where Collectly lives. $49-149/month, 10-minute setup, AI-native.

In this post, we walk through:
1. The exact market segmentation
2. Why legacy vendors won't move downmarket
3. The wedge we're building
4. Our 90-day launch plan

If you run a small business, this is for you.`,
  },
};

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) notFound();
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <article className="container-tight py-16">
        <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900"><ArrowLeft className="h-3.5 w-3.5" />Back to blog</Link>
        <div className="mt-6 text-xs text-ink-500">{post.date} · {post.read} read</div>
        <h1 className="mt-2 text-4xl sm:text-5xl font-display font-bold tracking-tight text-ink-950 leading-tight">{post.title}</h1>
        <div className="mt-8 prose prose-ink max-w-none">
          {post.body.split('\n\n').map((p, i) => (
            <p key={i} className="mt-5 text-ink-700 leading-relaxed whitespace-pre-wrap">{p}</p>
          ))}
        </div>
      </article>
      <MarketingFooter />
    </div>
  );
}
