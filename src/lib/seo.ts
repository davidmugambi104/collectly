// Centralized SEO helpers.
//
// The Collectly brand name collides with a $29M-Series-A healthcare billing
// company (collectly.com / collectly.io). We work around this by:
//  1. Repeating a brand disambiguator on every public surface.
//  2. Using structured data (Organization, Product, SoftwareApplication, FAQPage,
//     BreadcrumbList) so Google can match our result to the small-business-AR
//     niche even when it can't beat the other Collectly on raw domain authority.
//  3. Putting exact-intent phrasing (Xero, invoice reminder, agency, etc.) in
//     titles + descriptions — not the bare brand name.
//
// If we ever rename, the only file that needs editing is this one: every page
// pulls metadata through `pageMetadata()` or one of the typed builders below.

import type { Metadata } from 'next';

export const BRAND = 'Collectly';
// All absolute URLs returned to crawlers must use the live production
// domain (getcollectly.app). collectly.app is the parked brand-fallback we
// may point at this Vercel project later — until then, every canonical,
// OpenGraph, JSON-LD `url`, and RSS link references getcollectly.app.
//
// If we ever rename, change DOMAIN here and the SITE fields below — no
// other file is edited.
export const DOMAIN = 'https://getcollectly.app';

// The disambiguator that goes on every brand surface. Keep it short — under
// 60 chars when combined with the brand, or it kills OG titles.
export const TAGLINE = 'AR automation for small agencies and consultancies';
export const BRAND_LONG = `${BRAND} — ${TAGLINE}`;

// Phrases that Google's "site:collectly.app" / "Collectly for Xero" queries
// need to find. Use these in page titles and H1s.
export const KEYWORDS_PRIMARY = [
  'Xero invoice reminder',
  'accounts receivable automation',
  'AR automation for agencies',
  'Chaser alternative',
  'invoice chasing software',
  'AI dunning',
];

export const SITE = {
  name: BRAND,
  alternateName: ['Collectly for Xero', 'Collectly AR', 'Collectly App'],
  description:
    `${BRAND} is the accounts-receivable automation tool for 5-30 person ` +
    `agencies and consultancies on Xero and QuickBooks. It drafts client-safe ` +
    `invoice reminders, pauses when a customer replies or pays, tracks ` +
    `promised-payment dates, and separates disputes from ordinary late ` +
    `payment. From $49/mo flat.`,
  url: DOMAIN,
  locale: 'en_US',
  twitter: '@getcollectly',
  email: 'hello@getcollectly.app',
};

// ─── Metadata builders ─────────────────────────────────────────────────────

export type PageMetaInput = {
  title: string;             // becomes `${title} · ${BRAND}` via the layout template
  description: string;
  path?: string;             // absolute path, e.g. '/pricing'
  image?: string;            // absolute or root-relative; defaults to /og.png
  keywords?: string[];
  noindex?: boolean;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
};

export function pageMetadata(input: PageMetaInput): Metadata {
  const url = input.path ? `${SITE.url}${input.path}` : SITE.url;
  const image = input.image ?? `${SITE.url}/og.png`;
  return {
    // Mark `title` as `absolute` so the layout-level title.template ('%s ·
    // Collectly') is NOT auto-applied. We control the brand suffix
    // explicitly in OG/Twitter cards below and keep the page title
    // standalone so long page titles are not duplicated in the SERP.
    title: { absolute: input.title },
    description: input.description,
    keywords: input.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: input.type ?? 'website',
      url,
      title: `${input.title} · ${BRAND}`,
      description: input.description,
      siteName: BRAND_LONG,
      images: [{ url: image, width: 1200, height: 630, alt: BRAND_LONG }],
      locale: SITE.locale,
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${input.title} · ${BRAND}`,
      description: input.description,
      images: [image],
      creator: SITE.twitter,
      site: SITE.twitter,
    },
    robots: input.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  };
}

// ─── JSON-LD builders ──────────────────────────────────────────────────────

type JsonLdThing = Record<string, unknown>;

export function orgJsonLd(): JsonLdThing {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND,
    alternateName: SITE.alternateName,
    url: SITE.url,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE.url}/icon.svg`,
      width: 32,
      height: 32,
    },
    description: SITE.description,
    email: SITE.email,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: SITE.email,
        availableLanguage: ['English'],
        areaServed: ['GB', 'US', 'AU', 'CA', 'KE', 'NG'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: SITE.email,
        availableLanguage: ['English'],
        areaServed: ['GB', 'US', 'AU', 'CA', 'KE', 'NG'],
      },
    ],
    sameAs: [
      // Add real profiles once we have them. Empty array is fine for now.
    ],
    foundingDate: '2024',
    founder: { '@type': 'Person', name: 'Davie' },
    knowsAbout: [
      'Accounts receivable automation',
      'Invoice chasing',
      'Xero integrations',
      'QuickBooks integrations',
      'Small business cash flow',
      'Tone-aware AI',
      'Promise-to-pay tracking',
    ],
  };
}

export function softwareAppJsonLd(): JsonLdThing {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: BRAND,
    alternateName: SITE.alternateName,
    url: SITE.url,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Accounts Receivable Automation',
    operatingSystem: 'Web',
    description: SITE.description,
    offers: {
      '@type': 'Offer',
      price: '49',
      priceCurrency: 'USD',
      priceValidUntil: '2027-12-31',
      availability: 'https://schema.org/InStock',
      description: 'Founding-customer price. First 20 customers; locked for life.',
    },
    // aggregateRating intentionally omitted — we don't have enough verified
    // reviews yet to publish a number we can defend. Add when we do.
    featureList: [
      'Xero OAuth sync (live)',
      'QuickBooks OAuth sync (beta)',
      'Tone-aware email reminders',
      'Reply detection and pause',
      'Promise-to-pay tracking',
      'Dispute and blocker classification',
      'Approval workflow',
      'Audit trail',
    ],
  };
}

export function faqJsonLd(items: Array<{ q: string; a: string }>): JsonLdThing {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): JsonLdThing {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE.url}${it.path}`,
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
}): JsonLdThing {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE.url}${input.path}` },
    url: `${SITE.url}${input.path}`,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: {
      '@type': 'Person',
      name: input.authorName ?? 'Davie',
      url: SITE.url,
      worksFor: { '@type': 'Organization', name: BRAND, url: SITE.url },
    },
    publisher: {
      '@type': 'Organization',
      name: BRAND,
      logo: { '@type': 'ImageObject', url: `${SITE.url}/icon.svg` },
    },
    image: `${SITE.url}/og.png`,
  };
}

// Pricing-page Product + Offer. Surfaces a "from $49/mo" rich result
// for queries like "Collectly pricing" and "small-business AR pricing".
// We expose three tiers (founding, core, growth) so Google can pick the
// most relevant card for a given price bucket.
export function pricingProductJsonLd(): JsonLdThing {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${BRAND} — accounts-receivable automation for agencies`,
    description:
      'AI-native accounts-receivable automation for 5-30 person agencies and consultancies. ' +
      'Tone-aware email reminders, reply-or-pay pause, promise-to-pay tracking, and ' +
      'dispute classification on Xero and QuickBooks.',
    brand: { '@type': 'Brand', name: BRAND },
    category: 'BusinessApplication > Accounts Receivable Automation',
    offers: [
      {
        '@type': 'Offer',
        name: 'Founding customer',
        price: '49',
        priceCurrency: 'USD',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/LimitedAvailability',
        description:
          'First 20 customers only. Flat $49/month, includes founder-assisted setup, ' +
          'one Xero org, up to 150 monitored invoices, email reminders, approval mode, ' +
          'reply detection, promise-to-pay, and dispute classification.',
        url: `${SITE.url}/pricing`,
      },
      {
        '@type': 'Offer',
        name: 'Core',
        price: '99',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        description:
          'For one organization. Up to 300 monitored invoices, full email automation, ' +
          'approval mode, promise-to-pay tracking, and multi-currency support.',
        url: `${SITE.url}/pricing`,
      },
      {
        '@type': 'Offer',
        name: 'Growth',
        price: '199',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        description:
          'Up to three organizations. Adds SMS dunning, custom workflows, larger invoice ' +
          'volume, and reporting.',
        url: `${SITE.url}/pricing`,
      },
      {
        '@type': 'Offer',
        name: 'Practice',
        price: '499',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        description:
          'For accounting practices managing up to ten client organizations on Xero or ' +
          'QuickBooks. Includes per-client visibility and exception reporting.',
        url: `${SITE.url}/pricing`,
      },
    ],
  };
}

// Per-page WebPage schema. Useful on landing pages where you want a
// richer snippet than the bare URL.
export function webPageJsonLd(input: {
  title: string;
  description: string;
  path: string;
  kind?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'FAQPage';
}): JsonLdThing {
  return {
    '@context': 'https://schema.org',
    '@type': input.kind ?? 'WebPage',
    name: input.title,
    description: input.description,
    url: `${SITE.url}${input.path}`,
    isPartOf: { '@type': 'WebSite', name: BRAND, url: SITE.url },
    inLanguage: 'en-US',
  };
}

// Author page schema. Used on /about or any profile pages. Single
// author for now (the founder).
export function personJsonLd(): JsonLdThing {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Davie',
    url: SITE.url,
    worksFor: { '@type': 'Organization', name: BRAND, url: SITE.url },
    jobTitle: 'Founder',
    knowsAbout: [
      'Accounts receivable automation',
      'Small-business cash flow',
      'Xero integrations',
      'QuickBooks integrations',
      'Tone-aware AI',
      'Promise-to-pay tracking',
    ],
  };
}

// HowTo schema for the AR audit playbook. Used on /playbook if you
// keep the 5-step method as a numbered list. Higher CTR in SERP than a
// plain description for query patterns like "how to cut DSO".
export function howToJsonLd(input: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string }>;
}): JsonLdThing {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    step: input.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
}

export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + '…';
}
