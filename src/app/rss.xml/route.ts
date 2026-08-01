import { POSTS } from '@/lib/posts';
import { SITE, BRAND } from '@/lib/seo';

// RSS 2.0 feed for the Collectly blog. Served at /rss.xml.
//
// Why: 1) Bing Webmaster + Feedly submissions want an RSS URL.
//      2) Anyone using a reader gets a soft signal that we publish real
//         content on a cadence (not just patched-together landing pages).
//      3) The feed itself is indexable, so each item doubles as a SERP surface.

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? SITE.url;
  const buildDate = new Date().toUTCString();
  const items = POSTS.map((p) => {
    const link = `${base}/blog/${p.slug}`;
    const pubDate = new Date(p.date).toUTCString();
    return `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(p.excerpt)}</description>
      <category>${escapeXml(p.tags.join(', '))}</category>
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(BRAND)} blog</title>
    <link>${base}/blog</link>
    <description>${escapeXml(`${BRAND} blog — notes on A/R, cash flow, and small-business finance.`)}</description>
    <language>en-US</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // 1h + 24h stale-while-revalidate matches the HTML policy. RSS consumers
      // poll often; this keeps edge costs low.
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
