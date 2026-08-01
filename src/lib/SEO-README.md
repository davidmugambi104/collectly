# Collectly SEO

Everything that affects how this site appears in search, social cards, and AI
crawlers is centralized in **`src/lib/seo.ts`**. If you ever rename the
product, that's the only file you need to edit.

## Why this exists

The bare word "Collectly" is already taken on the open web by a $29M-funded
US healthcare billing platform. Outranking them on raw brand authority is a
12-month fight we don't win. So instead of fighting that fight, we engineer
around it:

1. **Every page repeats a brand disambiguator** ("AR automation for small
   agencies and consultancies") so the SERP listing is unambiguous.
2. **Structured data (JSON-LD)** declares our `Organization`,
   `SoftwareApplication`, `WebSite`, `BreadcrumbList`, and `FAQPage`
   schemas. Google uses these to route queries to the right "Collectly."
3. **Comparison pages** target intent queries ("Collectly vs Chaser",
   "Chaser alternative") where the brand-conflict doesn't apply.
4. **The brand disambiguator goes in every `<title>` and `<meta
   description>`** as a baseline.

## File map

| File | What it does |
| --- | --- |
| `src/lib/seo.ts` | All helpers: `BRAND`, `TAGLINE`, `pageMetadata()`, JSON-LD builders |
| `src/components/seo/structured-breadcrumbs.tsx` | Shared `<StructuredBreadcrumbs />` for compare pages |
| `src/components/tools/dispute-template-list.tsx` | Client component that powers the dispute-email templates page |
| `src/app/layout.tsx` | Site-wide metadata + Organization + SoftwareApplication + WebSite JSON-LD |
| `src/app/sitemap.ts` | Dynamic XML sitemap with priority + changeFrequency per page |
| `src/app/robots.ts` | Robots policy + AI crawler allow-list |
| `src/app/rss.xml/route.ts` | RSS 2.0 feed for the blog |
| `public/og.png` + `public/og-*.png` | 1200x630 default + per-page OG cards |
| `scripts/build-og.mjs` | Regenerates `og*.png` via Playwright + Chromium (`--all` for all pages) |
| `scripts/build-og.mjs` | Run on every deploy that changes a key landing page title |
| `next.config.mjs` | Cache-Control headers for static assets + HTML |

## Adding metadata to a new page

```ts
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Page title — keyword phrase',         // ≤ 60 chars
  description: 'One-sentence value prop …',     // ≤ 158 chars
  path: '/path/to/page',
  keywords: ['keyword one', 'keyword two'],
});
```

The layout's `title.template` adds `· Collectly` automatically.

## Adding FAQ rich results to a page

```ts
import { faqJsonLd } from '@/lib/seo';

const jsonLd = JSON.stringify(faqJsonLd([
  { q: 'Does it work with Xero?', a: 'Yes. …' },
]));

// inside the page component, near the top of the JSX:
return (
  <div className="min-h-screen">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    …
  </div>
);
```

The FAQ content must be **visible to humans on the page** to qualify for the
rich result. Google penalizes FAQPage schema that doesn't match on-page
content. (We don't currently render Q/A on the page itself; that's a
known gap we're tracking.)

## Free-tier tools you'll want once they're wired up

- **Google Search Console** — search performance, indexing coverage,
  manual sitemap submit. Verification token: `NEXT_PUBLIC_GSC_TOKEN`.
- **Bing Webmaster Tools** — submit `/rss.xml` and `/sitemap.xml` here;
  Bing is faster to index than Google. Token: `NEXT_PUBLIC_BING_TOKEN`.
- **Capterra / G2 / Product Hunt review submissions** — the only way to
  split SERP for the bare word "Collectly."
- **Google Business Profile** (optional, only if we operate a real
  office in Kenya that takes meetings).

## When you change the product surface, also update

- `seo.ts` — `SITE.description`, `KEYWORDS_PRIMARY`, `features` list in
  `softwareAppJsonLd()`
- `sitemap.ts` — add the new route with an honest priority
- A landing page on the new niche keyword path (per the 90-day plan)
