// Content-Security-Policy, in Report-Only mode.
//
// Shipped Report-Only, not enforcing, because the exact set of first-party
// vs. third-party script/connect origins can't be verified from the repo
// alone: NEXT_PUBLIC_POSTHOG_HOST is a Vercel env value this process can't
// read, and Clerk's own script/connect/frame origins depend on which bot-
// protection and OAuth providers are active for this instance. Getting any
// of those wrong in enforcing mode would silently break sign-in or payment
// pages for the handful of real visitors this app has today, which is worse
// than shipping no CSP at all. Report-Only sends none of that risk: nothing
// is blocked, browsers just log would-be violations to the console.
//
// Before switching the header name below to the enforcing
// 'Content-Security-Policy': load /, /sign-in, /dashboard (signed in) and a
// live /pay/<id> link in a real browser, open the console, and add any
// origin that logs a violation there. Known third-party origins already
// accounted for: Google AdSense (pagead2.googlesyndication.com), Microsoft
// Clarity (www.clarity.ms, c.clarity.ms), Clerk's own domains, and whatever
// NEXT_PUBLIC_POSTHOG_HOST resolves to (PostHog's own JS ships in our bundle
// as 'self'; only its network calls need connect-src).
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  // 'unsafe-inline' on script-src covers the Clarity loader, which is an
  // inline IIFE (see src/components/consent/gated-scripts.tsx) rather than a
  // plain src= tag so it can define the clarity() queue before its remote
  // tag arrives. Tightening this to a nonce is follow-up work, not part of
  // this report-only rollout.
  "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://www.clarity.ms https://challenges.cloudflare.com https://*.clerk.com https://*.clerk.accounts.dev",
  "style-src 'self' 'unsafe-inline'",
  // Broad on purpose: next.config's images.remotePatterns already allows any
  // https host through the Next image optimizer, and Clerk/Google avatar
  // images come from their own CDNs.
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.posthog.com https://*.i.posthog.com https://www.clarity.ms https://c.clarity.ms https://*.clerk.com https://*.clerk.accounts.dev",
  "frame-src 'self' https://accounts.google.com https://*.clerk.com",
].join('; ');

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
  // /ar-roi is a permanent alias of /tools/ar-roi. It used to live in a page
  // component calling permanentRedirect(), which never produced a 308: the
  // root layout wraps children in <Suspense>, so the response streams and
  // commits 200 OK before the redirect throws, and Next falls back to a
  // client-side <meta http-equiv="refresh">. The old URL therefore stayed a
  // second indexable page, self-canonicalising, passing no link equity.
  // A redirect declared here is emitted before rendering starts.
  async redirects() {
    return [
      { source: '/ar-roi', destination: '/tools/ar-roi', permanent: true },
      // www.mugavi.com answered 200 with the same pages as the bare domain, a
      // second crawlable copy of the site. Send it to the bare domain.
      { source: '/:path*', has: [{ type: 'host', value: 'www.mugavi.com' }], destination: 'https://mugavi.com/:path*', permanent: true },
    ];
  },

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
          // Nothing of ours is meant to be framed by another site; this stops clickjacking of the dashboard.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
          { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
        ],
      },
      {
        // Explicit no-store on per-session surfaces. The rule below only stops
        // the public cache header reaching them; this states the intent, which
        // is what a security reviewer curls for.
        source: '/:section(dashboard|admin|sign-in|sign-up|sso-callback)/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
      },
      {
        source: '/api/:provider(quickbooks|xero|square|stripe-connect|plaid|integrations)/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
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
