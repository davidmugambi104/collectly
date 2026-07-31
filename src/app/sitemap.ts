import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return [
    '', '/pricing', '/features', '/blog', '/customers', '/about', '/contact',
    '/changelog', '/privacy', '/terms', '/security', '/dpa', '/integrations', '/tools/ar-roi',
    '/tools/ar-cost-calculator', '/playbook', '/interview',
    '/compare', '/ar-audit', '/tour',
    '/vs-chaser', '/vs-bill', '/vs-melio', '/vs-quickbooks',
    '/vs-gaviti', '/vs-growfin', '/vs-highradius', '/vs-freshbooks', '/vs-zohobooks',
  ].map((p) => ({ url: `${base}${p}`, lastModified: new Date() }));
}
