import type { MetadataRoute } from 'next';
import { POSTS } from '@/lib/posts';
import { absoluteUrl } from '@/lib/seo';

// Crawl-priority model:
//
//  1.0 + monthly  → money pages (home, pricing, signup)
//  0.9 + monthly  → comparison pages (high-intent "vs X" queries)
//  0.8 + weekly   → tools (ar-audit, ar-roi, cost-calculator), case-study hubs
//  0.7 + monthly  → feature pages, integrations, playbook, interview
//  0.6 + weekly   → blog index, changelog
//  0.6 + monthly  → blog posts (recent) → taper to 0.4 after 30d, 0.2 after 90d
//  0.3            → about, contact, security, dpa, terms, privacy
//
// `lastModified` is intentionally the build timestamp: cheaper than per-page
// file mtimes and Google tolerates it as long as it never moves backwards.

const FIXED: Array<{
  path: string;
  priority: number;
  changefreq: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  // Money
  { path: '', priority: 1.0, changefreq: 'weekly' },
  { path: '/pricing', priority: 1.0, changefreq: 'monthly' },
  { path: '/features', priority: 0.9, changefreq: 'monthly' },
  { path: '/integrations', priority: 0.9, changefreq: 'monthly' },
  // Compare (highest organic-intent pages we publish)
  { path: '/vs-bill', priority: 0.9, changefreq: 'monthly' },
  { path: '/vs-chaser', priority: 0.9, changefreq: 'monthly' },
  { path: '/vs-melio', priority: 0.9, changefreq: 'monthly' },
  { path: '/vs-quickbooks', priority: 0.9, changefreq: 'monthly' },
  { path: '/vs-freshbooks', priority: 0.9, changefreq: 'monthly' },
  { path: '/vs-gaviti', priority: 0.9, changefreq: 'monthly' },
  { path: '/vs-growfin', priority: 0.9, changefreq: 'monthly' },
  { path: '/vs-highradius', priority: 0.9, changefreq: 'monthly' },
  { path: '/vs-zohobooks', priority: 0.9, changefreq: 'monthly' },
  { path: '/compare', priority: 0.9, changefreq: 'monthly' },
  // Industry beachheads (long-tail keyword clusters)
  { path: '/for/agencies', priority: 0.8, changefreq: 'monthly' },
  { path: '/for/consultancies', priority: 0.8, changefreq: 'monthly' },
  { path: '/for/uk-agencies', priority: 0.9, changefreq: 'monthly' },
  // High-intent tools
  { path: '/ar-audit', priority: 0.8, changefreq: 'monthly' },
  { path: '/ar-roi', priority: 0.8, changefreq: 'monthly' },
  { path: '/tour', priority: 0.8, changefreq: 'monthly' },
  // Free tools — capture 'free template' / 'free calculator' long-tail
  { path: '/tools/dispute-email-template', priority: 0.7, changefreq: 'monthly' },
  { path: '/tools/dso-calculator', priority: 0.7, changefreq: 'monthly' },
  // Content hubs
  { path: '/blog', priority: 0.7, changefreq: 'weekly' },
  { path: '/playbook', priority: 0.7, changefreq: 'monthly' },
  { path: '/interview', priority: 0.7, changefreq: 'monthly' },
  { path: '/changelog', priority: 0.6, changefreq: 'weekly' },
  // Trust / support
  { path: '/about', priority: 0.3, changefreq: 'monthly' },
  { path: '/contact', priority: 0.3, changefreq: 'monthly' },
  { path: '/customers', priority: 0.6, changefreq: 'monthly' },
  { path: '/security', priority: 0.3, changefreq: 'monthly' },
  { path: '/dpa', priority: 0.3, changefreq: 'yearly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/terms', priority: 0.3, changefreq: 'yearly' },
];

const NOW = new Date();

function blogEntries(): MetadataRoute.Sitemap {
  return POSTS.map((p) => {
    const ageDays = (NOW.getTime() - new Date(p.date).getTime()) / 86_400_000;
    let priority = 0.6;
    let changefreq: MetadataRoute.Sitemap[number]['changeFrequency'] = 'monthly';
    if (ageDays <= 30) {
      priority = 0.8;
      changefreq = 'weekly';
    } else if (ageDays <= 90) {
      priority = 0.6;
    } else if (ageDays <= 365) {
      priority = 0.4;
    } else {
      priority = 0.2;
    }
    return {
      url: absoluteUrl(`/blog/${p.slug}`),
      lastModified: new Date(p.date),
      changeFrequency: changefreq,
      priority,
    };
  });
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcollectly.app';
  const fixed = FIXED.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: NOW,
    changeFrequency: p.changefreq,
    priority: p.priority,
  }));
  return [...fixed, ...blogEntries()];
}
