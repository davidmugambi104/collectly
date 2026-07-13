import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { POSTS_BY_SLUG } from '@/lib/posts';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Calendar, Tag } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = POSTS_BY_SLUG[slug];
  if (!post) notFound();

  const otherPosts = Object.values(POSTS_BY_SLUG).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <article className="container-tight py-16">
        <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900"><ArrowLeft className="h-3.5 w-3.5" />Back to blog</Link>
        <div className="mt-6 flex items-center gap-3 text-xs text-ink-500">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{post.date}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.read} read</span>
        </div>
        <h1 className="mt-3 text-4xl sm:text-5xl font-display font-bold tracking-tight text-ink-950 leading-tight">{post.title}</h1>
        <p className="mt-4 lead">{post.excerpt}</p>
        <div className="mt-6 prose prose-ink max-w-none">
          {post.body.split('\n\n').map((p, i) => {
            if (p.startsWith('## ')) {
              return <h2 key={i} className="mt-12 text-2xl font-display font-semibold text-ink-950">{p.slice(3)}</h2>;
            }
            if (p.startsWith('### ')) {
              return <h3 key={i} className="mt-8 text-xl font-display font-semibold text-ink-900">{p.slice(4)}</h3>;
            }
            if (p.startsWith('| ')) {
              const rows = p.split('\n').filter(Boolean);
              const header = rows[0].split('|').map((s) => s.trim()).filter(Boolean);
              const body = rows.slice(2).map((r) => r.split('|').map((s) => s.trim()).filter(Boolean));
              return (
                <div key={i} className="my-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left border-b border-ink-200">{header.map((h, j) => <th key={j} className="py-2 pr-4 font-semibold text-ink-700">{h}</th>)}</tr></thead>
                    <tbody>{body.map((row, j) => <tr key={j} className="border-b border-ink-100">{row.map((c, k) => <td key={k} className="py-2 pr-4 text-ink-700">{c}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              );
            }
            if (p.startsWith('- ')) {
              const items = p.split('\n').map((l) => l.replace(/^- /, '').trim());
              return <ul key={i} className="mt-4 list-disc pl-5 space-y-1.5 text-ink-700">{items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
            }
            if (p.startsWith('**') && p.endsWith('**')) {
              return <p key={i} className="mt-4 font-semibold text-ink-900">{p.slice(2, -2)}</p>;
            }
            return <p key={i} className="mt-4 text-ink-700 leading-relaxed whitespace-pre-wrap">{p}</p>;
          })}
        </div>
        <div className="mt-10 flex items-center gap-2 flex-wrap">
          {post.tags.map((t) => (
            <span key={t} className="badge-neutral"><Tag className="h-3 w-3 mr-1" />{t}</span>
          ))}
        </div>
      </article>

      <section className="bg-ink-50 border-t border-ink-200">
        <div className="container-page py-12">
          <h3 className="font-display font-semibold text-lg text-ink-900">More from the blog</h3>
          <div className="mt-5 grid md:grid-cols-3 gap-4">
            {otherPosts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="card hover:border-ink-300">
                <div className="text-xs text-ink-500">{p.date} · {p.read}</div>
                <h4 className="mt-1 font-semibold text-ink-900">{p.title}</h4>
                <p className="mt-1 text-sm text-ink-600 line-clamp-2">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
