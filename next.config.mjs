/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Real ESLint config was added this session where none existed before
  // (see eslint.config.mjs). `next build` auto-detects it and fails the
  // build on lint errors by default — it surfaces ~490 pre-existing
  // findings, which would break every deploy starting now. CI runs lint
  // informationally (warn-only) separately; keep the build itself
  // unblocked until that backlog is deliberately triaged.
  eslint: { ignoreDuringBuilds: true },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
  serverExternalPackages: ['@electric-sql/pglite'],
  // Cache headers — combine with content-hashed filenames Next emits for
  // /_next/static. Static assets (1y, immutable) are the main SEO perf
  // lever. Images (1d) follow Next's on-demand optimizer. The fallback
  // "s-maxage=3600, stale-while-revalidate=86400" lets a CDN edge cache
  // our HTML for 1h + stale-serve for 24h, which matters because our
  // sitemap/OG values are sensitive to deploy-time changes.
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/icon.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' },
        ],
      },
      {
        source: '/og.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' },
        ],
      },
      {
        // Security headers are safe on every response, authenticated or not.
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // Public-cache Cache-Control must NOT reach /dashboard, /admin,
        // /api, /pay, or the auth routes — those are per-org or per-session
        // responses. A CDN edge cache is keyed by URL only, not by cookie,
        // so tagging /dashboard/dunning (same URL for every org) as
        // `public, s-maxage=3600` would let one organization's rendered
        // dashboard be served straight from cache to a different
        // organization for up to an hour, without even reaching the origin
        // (and its Clerk auth check) again. Excluded here rather than
        // overridden below: Next.js appends matching header blocks instead
        // of replacing them, so two rules setting Cache-Control for the same
        // path can both end up on the response.
        source: '/((?!api|dashboard|admin|pay|sign-in|sign-up|sso-callback).*)',
        headers: [
          {
            key: 'Cache-Control',
            value:
              'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) return config;
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push({ '@electric-sql/pglite': 'commonjs @electric-sql/pglite' });
    }
    return config;
  },
};
export default nextConfig;
