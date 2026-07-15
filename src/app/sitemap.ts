import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return [
    '', '/pricing', '/features', '/blog', '/customers', '/about', '/contact',
    '/changelog', '/privacy', '/terms', '/security', '/dpa', '/integrations', '/tools/ar-roi',
  ].map((p) => ({ url: `${base}${p}`, lastModified: new Date() }));
}
