# Agent 13: Marketing site & SEO

## Tests run (with verbatim output)

### 1. Homepage headers
```
HTTP/2 200
accept-ranges: bytes
access-control-allow-origin: *
age: 847
cache-control: public, max-age=0, must-revalidate
content-disposition: inline
content-type: text/html; charset=utf-8
date: Fri, 31 Jul 2026 13:12:02 GMT
etag: "a82d10f09f9d1464ea2c8fce6dd19a5f"
server: Vercel
strict-transport-security: max-age=63072000
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-clerk-auth-reason: session-token-and-uat-missing
x-clerk-auth-status: signed-out
x-matched-path: /
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
x-vercel-cache: HIT
x-vercel-id: cpt1::qfn69-1785503522021-4b2b391b2570
content-length: 190215
```

### 2. Sitemap (first 20 lines)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://getcollectly.app</loc>
<lastmod>2026-07-31T12:53:02.817Z</lastmod>
</url>
<url>
<loc>https://getcollectly.app/pricing</loc>
<lastmod>2026-07-31T12:53:02.817Z</lastmod>
</url>
<url>
<loc>https://getcollectly.app/features</loc>
<lastmod>2026-07-31T12:53:02.817Z</lastmod>
</url>
<url>
<loc>https://getcollectly.app/blog</loc>
<lastmod>2026-07-31T12:53:02.817Z</lastmod>
</url>
<url>
<loc>https://getcollectly.app/customers</loc>
```
Sitemap: 111 lines (≈55 URLs). Includes `/blog/page-90ff1257c909d8e4`.

### 3. robots.txt
```
User-Agent: *
Allow: /
Disallow: /dashboard
Disallow: /api
Disallow: /sign-in
Disallow: /sign-up

Sitemap: https://getcollectly.app/sitemap.xml
```

### 4. Pricing page meta tags
```html
<meta charSet="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="theme-color" content="#0a0b0f"/>
<meta name="description" content="Collectly follows up on overdue invoices the way a thoughtful operations person would — adapting tone to context, escalating when appropriate, tracking promises to pay, and keeping you out of the uncomfortable parts. Built for small B2B service businesses on QBO or Xero."/>
<meta name="keywords" content="accounts receivable,AR automation,invoice collection,cash flow,AI dunning,small business,late invoice follow-up,payment chasing"/>
<meta name="robots" content="index, follow"/>
<meta property="og:title" content="Collectly — stop being the one who has to ask"/>
<meta property="og:description" content="Collectly follows up on overdue invoices the way a thoughtful operations person would. Built for small B2B service businesses."/>
<meta property="og:site_name" content="Collectly"/>
<meta property="og:type" content="website"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="Collectly — stop being the one who has to ask"/>
<meta name="twitter:description" content="AI-native accounts receivable that handles the awkward parts. For small B2B service businesses on QBO or Xero."/>
```

### 5. Blog index URLs and status probes
Blog index links found:
```
/blog/ar-automation-for-small-business-2026
/blog/best-dunning-templates-2026
/blog/cash-flow-forecasting-small-business
/blog/cut-dso-5-step-playbook-2026
/blog/final-notice-that-gets-paid-2026
/blog/page-90ff1257c909d8e4
/blog/true-cost-of-late-payments-small-business-2026
```
Status for each individual post: `HTTP 307` → redirects to `/sign-in`.
Sample redirect headers:
```
HTTP/2 307
location: /sign-in
x-clerk-auth-reason: session-token-and-uat-missing
x-clerk-auth-status: signed-out
```

### 6. Structured data (`"@type":...`)
No schema.org structured data found on the homepage or any tested marketing page.

### 7. Internal link probe (3 pages → all discovered links)
Paths extracted from `/`, `/pricing`, `/features`:
```
/about, /ar-audit, /compare, /contact, /dpa, /features, /integrations,
/pricing, /privacy, /security, /sign-in, /sign-up, /terms, /tour,
/vs-bill, /vs-chaser, /vs-melio, /vs-quickbooks
```
All probed returned `200`.

### 8. Page speed
Homepage TTFB / total transfer time from Cape Town-ish node:
```
0.508056 s, HTTP 200 (Vercel HIT)
```

## Best-practice search findings

1. **Next.js Metadata API / 2026 audits**
   - 2026 default is App Router + Server Components; Metadata API replaces `next/head`.
   - Static metadata objects and async `generateMetadata()` are the canonical pattern.
   - Streaming metadata separately means the `<head>` must not block on client data.
   - Common audit fails: duplicate or missing canonicals, identical titles/descriptions across routes, missing OG image, and no JSON-LD.

2. **B2B SaaS landing-page conversion 2026**
   - Median SaaS landing page converts at ~3.8%; top quartile at 11.6%+.
   - Highest-impact changes: single CTA focus (+266%), personalized CTAs (+202%), fewer form fields (+160%), embedded/interactive demo (+86%), testimonials (+34%), visible pricing (+20–30%), and review badges (+15–22%).
   - Message match between ad and page is critical; clutter kills conversion.

## What I found

| Area | Finding | Severity |
|------|---------|----------|
| **Blog posts** | All 7 indexed blog posts redirect anonymous users to `/sign-in` with 307. Search engines can see the index page, but the actual article URLs are not publicly crawlable. | High |
| **Structured data** | No schema.org/JSON-LD on homepage, pricing, or blog. Missing `Organization`, `WebSite`, `Product`, `SoftwareApplication`, `BlogPosting`, `BreadcrumbList`. | High |
| **Meta tags — duplicate** | `/blog` and `/pricing` reuse the homepage title/description/OG/Twitter. Each route needs unique metadata. | High |
| **Sitemap hygiene** | Includes `/blog/page-90ff1257c909d8e4` (looks like a Next.js build chunk route, not a real page). Should be removed. | Medium |
| **Canonical URLs** | No `<link rel="canonical">` emitted on tested pages. | Medium |
| **OG/Twitter images** | `og:image` and `twitter:image` tags are missing. Social shares will use fallback/no image. | Medium |
| **Robots.txt** | Clean and correct; private routes (`/dashboard`, `/api`, auth) are disallowed. Sitemap referenced. | Good |
| **Internal links** | All 15 sampled marketing links returned `200`. | Good |
| **Security/headers** | HSTS, Vercel cache, Next.js prerender header present. HTTPS enforced. | Good |
| **Performance** | ~0.5 s served from Vercel cache; acceptable but not measured for Core Web Vitals. | OK |
| **Keywords meta** | Present but Google does not use `keywords` meta for ranking. | Neutral |

## What should change

1. **Fix blog access for anonymous users** — stop redirecting `/blog/*` to sign-in. Articles should be public 200 pages.
2. **Add unique per-route metadata** — `/blog`, `/pricing`, `/features`, comparison pages, and each article need distinct `<title>` and `meta description` via `generateMetadata()`.
3. **Add canonical tags** — every page should emit `<link rel="canonical" href="https://getcollectly.app/<path>" />`.
4. **Add JSON-LD structured data** — at minimum:
   - `Organization` + `WebSite` (with `SearchAction`) on homepage.
   - `SoftwareApplication` with `offers`, `aggregateRating` (when available) on `/features` or `/pricing`.
   - `BlogPosting` on each article.
5. **Add `og:image` / `twitter:image`** — generate default and per-page OG images (Next.js `@vercel/og` or `ImageResponse`).
6. **Clean sitemap** — remove `/blog/page-90ff1257c909d8e4` and ensure only public 200 URLs are listed. Consider splitting blog posts into a separate sitemap.
7. **Add `lastmod` accuracy** — current sitemap uses a single global timestamp; per-route `lastmod` is preferable.
8. **Add hreflang / locale** — currently only `lang="en"`; if multi-region marketing expands, add hreflang annotations.
9. **Set up Core Web Vitals monitoring** — page weight is large (~190 KB HTML for homepage); confirm LCP and INP budgets.
10. **Conversion tweaks** — visible pricing is already present (good). Consider making the homepage hero CTA singular, adding a video/interactive demo CTA, and surfacing testimonials/review badges.

## Source / evidence

- `curl -sD- https://getcollectly.app/` — homepage headers & HTML.
- `curl -s https://getcollectly.app/sitemap.xml` — sitemap content.
- `curl -s https://getcollectly.app/robots.txt` — robots content.
- `curl -s https://getcollectly.app/pricing | grep -oE '<meta[^>]+>'` — pricing meta tags.
- `curl -s https://getcollectly.app/blog` + per-article `curl -I` — 307 → `/sign-in`.
- `curl -s https://getcollectly.app/ | grep -oE '"@type":"[^"]+"'` — no structured data.
- Internal link probes across `/`, `/pricing`, `/features` — all 200.
- Web search: Next.js SEO metadata 2026 best practice; B2B SaaS landing page conversion 2026.
