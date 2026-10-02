// Centralized SEO helpers.
//
// The product was renamed from Mugavi to Mugavi on 2026-09-20, and the
// rename IS the SEO strategy. "Mugavi" collides with a $29M-Series-A
// healthcare billing company on collectly.com and collectly.io, and that fight
// was never winnable: we were spending every public surface on a disambiguator,
// leaning on structured data to compensate for losing on domain authority, and
// deliberately keeping the bare brand name out of titles because it ranked the
// competitor instead of us.
//
// Mugavi has no incumbent. That means the brand name can now do the job a brand
// name is supposed to do -- carry exact-match intent -- rather than being a
// liability to work around. Domain authority starts near zero either way, since
// mugavi.com was 60 days old and barely indexed.
//
// What that changes below: the brand name is safe in titles now, and the
// disambiguator is a description of the product rather than a defence against
// being confused with someone else.
//
// If we ever rename again, change BRAND and DOMAIN here -- but note that the
// old claim "the only file that needs editing is this one" was not true: 345
// occurrences of the brand name lived in copy across 78 files.

import type { Metadata } from 'next';
import { PLAN_PRICING, FOUNDING, PRACTICE_INCLUDED_ORGS, PRACTICE_EXTRA_ORG_MONTHLY, PRACTICE_SCALE_INCLUDED_ORGS } from '@/lib/utils';
import { CONTACT } from './site-contact';

export const BRAND = 'Mugavi';
// All absolute URLs returned to crawlers must use the live production domain.
// mugavi.com stays attached to the Vercel project and 301s here -- it must
// keep resolving, because ~415 outreach recipients hold emails whose unsubscribe
// links point at it.
//
export const DOMAIN = 'https://mugavi.com';

// The disambiguator that goes on every brand surface. Keep it short — under
// 60 chars when combined with the brand, or it kills OG titles.
export const TAGLINE = 'AR automation for small agencies and consultancies';
export const BRAND_LONG = `${BRAND}: ${TAGLINE}`;

// Phrases that Google's "Mugavi for Xero" queries
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
  alternateName: ['Mugavi for Xero', 'Mugavi AR', 'Mugavi App'],
  description:
    `${BRAND} is the accounts-receivable automation tool for 5-30 person ` +
    `agencies and consultancies on Xero and QuickBooks. It drafts client-safe ` +
    `invoice reminders, pauses when a customer replies or pays, tracks ` +
    `promised-payment dates, and separates disputes from ordinary late ` +
    `payment. From $${PLAN_PRICING.starter.monthly}/mo flat.`,
  url: DOMAIN,
  locale: 'en_US',
  // NOT migrated with the rebrand, deliberately. This is a social handle, not a
  // domain: changing it to '@mugavi' would point twitter:site and
  // twitter:creator at whoever actually owns that handle, attributing this
  // site's content to a stranger. Update it only once the new handle is
  // registered to us -- and if it never is, delete these two tags instead.
  twitter: '@getcollectly',
  email: CONTACT.hello,
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

/** Search results cut descriptions near 155-160 characters. Keep whole
 *  sentences while they fit; otherwise cut at a word and add an ellipsis. */
export function fitMetaDescription(text: string, max = 158): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const sentences = t.match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? [];
  let out = '';
  for (const sentence of sentences) {
    if ((out + sentence).trim().length > max) break;
    out += sentence;
  }
  out = out.trim();
  if (out.length >= 60) return out;
  const cut = t.slice(0, max - 1).replace(/\s+\S*$/, '').replace(/[,;:\s-]+$/, '');
  return `${cut}…`;
}

export function pageMetadata(input: PageMetaInput): Metadata {
  const url = input.path ? `${SITE.url}${input.path}` : SITE.url;
  const image = input.image ?? `${SITE.url}/og.png`;
  return {
    // Mark `title` as `absolute` so the layout-level title.template ('%s ·
    // Mugavi') is NOT auto-applied. We control the brand suffix
    // explicitly in OG/Twitter cards below and keep the page title
    // standalone so long page titles are not duplicated in the SERP.
    title: { absolute: input.title },
    description: fitMetaDescription(input.description),
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
    // The founder's X profile is already linked publicly from the homepage
    // footer; leaving sameAs empty while that link exists just withholds from
    // search engines a connection the site already makes in its own markup.
    sameAs: ['https://x.com/daviemugambi', 'https://www.linkedin.com/in/davie-mugambi/'],
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
      // Read from PLAN_PRICING, not restated. This was hardcoded '49' while
      // every visible page said $149 and pricingProductJsonLd() emitted 149 —
      // a markup/visible-price mismatch on all 41 pages, which is a Google
      // structured-data policy violation, not just an inconsistency.
      price: String(PLAN_PRICING.starter.monthly),
      priceCurrency: 'USD',
      priceValidUntil: '2027-12-31',
      availability: 'https://schema.org/InStock',
      description: `Founding-customer price. First ${FOUNDING.seats} customers; ${FOUNDING.discountPct}% off for ${FOUNDING.months} months.`,
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

// Pricing-page Product + Offer. Surfaces a "from $79/mo" rich result
// for queries like "Mugavi pricing" and "small-business AR pricing".
// Every number here is read from PLAN_PRICING rather than restated: the
// offers, the page body and the FAQ answers used to disagree with each
// other and with the app, which is how a $49 headline ended up advertising
// limits (150 invoices, 3 users) the code never granted.
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
        name: `Founding ${PLAN_PRICING.growth.name}`,
        price: String(FOUNDING.monthly('growth')),
        priceCurrency: 'USD',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/LimitedAvailability',
        description:
          `First ${FOUNDING.seats} customers only. ${FOUNDING.discountPct}% off the ` +
          `${PLAN_PRICING.growth.name} plan for ${FOUNDING.months} months, then ` +
          `$${PLAN_PRICING.growth.monthly}/mo. Covers up to ${PRACTICE_INCLUDED_ORGS} client ` +
          'organizations on Xero or QuickBooks, with founder-assisted setup.',
        url: `${SITE.url}/pricing`,
      },
      {
        '@type': 'Offer',
        name: PLAN_PRICING.starter.name,
        price: String(PLAN_PRICING.starter.monthly),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        description:
          `${PLAN_PRICING.starter.audience}. One organization, unlimited invoices, ` +
          'email and SMS reminders, approval mode, promise-to-pay tracking, and ' +
          'dispute classification.',
        url: `${SITE.url}/pricing`,
      },
      {
        '@type': 'Offer',
        name: PLAN_PRICING.growth.name,
        price: String(PLAN_PRICING.growth.monthly),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        description:
          `${PLAN_PRICING.growth.audience}. Up to ${PRACTICE_INCLUDED_ORGS} client ` +
          `organizations, then $${PRACTICE_EXTRA_ORG_MONTHLY} per additional book. ` +
          'Per-client branding, consolidated AR across every client, multi-currency.',
        url: `${SITE.url}/pricing`,
      },
      {
        '@type': 'Offer',
        name: PLAN_PRICING.scale.name,
        price: String(PLAN_PRICING.scale.monthly),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        description:
          `${PLAN_PRICING.scale.audience}. Up to ${PRACTICE_SCALE_INCLUDED_ORGS} client organizations, plus API ` +
          'access, SSO, custom workflows, and priority support.',
        url: `${SITE.url}/pricing`,
      },
    ],
  };
}

// ─── Competitor facts (one source, two consumers) ──────────────────────────
//
// Keyed by the /vs-<slug> route. Every value here is what the corresponding
// comparison page already claims in its own DIFFS table — this map exists so
// /llms.txt and the pages' FAQ schema quote the same figures the page shows a
// human, rather than a third and fourth version of them.
//
// `pricing` is deliberately a posture phrase, not a number, for the vendors who
// do not publish one. Writing "$333/mo" for a quote-only vendor because a
// third-party listing said so is how a comparison page earns a correction.
export const COMPETITORS: Record<
  string,
  { name: string; pricing: string; builtFor: string; shape: string }
> = {
  bill: {
    name: 'BILL',
    pricing: '$49 per user/mo plus ACH, card and wire fees',
    builtFor: 'SMBs and accounting firms wanting broad FinOps',
    shape: 'an AP + AR + spend platform',
  },
  chaser: {
    name: 'Chaser',
    pricing: 'around $259/mo on its entry plan',
    builtFor: 'SMB to mid-market businesses, roughly $5M–$120M revenue',
    shape: 'a templated reminder-sequence tool',
  },
  freshbooks: {
    name: 'FreshBooks',
    pricing: 'from about $19/mo',
    builtFor: 'freelancers and small service businesses',
    shape: 'invoicing with basic payment tracking',
  },
  gaviti: {
    name: 'Gaviti',
    pricing: 'custom, quote on request',
    builtFor: 'mid-market and enterprise finance teams',
    shape: 'an implementation-led invoice-to-cash platform',
  },
  growfin: {
    name: 'Growfin',
    pricing: 'not published, quote on request',
    builtFor: 'enterprise AR managers and controllers',
    shape: 'a collections CRM for enterprise finance',
  },
  highradius: {
    name: 'HighRadius',
    pricing: 'enterprise contracts, quote on request',
    builtFor: 'large enterprises and the Office of the CFO',
    shape: 'a full order-to-cash, treasury and close suite',
  },
  melio: {
    name: 'Melio',
    pricing: '$0/mo with free ACH limits, then per-transaction fees',
    builtFor: 'small businesses paying bills',
    shape: 'AP-first bill pay with light invoicing',
  },
  paidnice: {
    name: 'Paidnice',
    pricing: 'by invoice volume, plus $29/mo for every entity after the first',
    builtFor: 'Xero and QuickBooks users wanting automated penalties and reminders',
    shape: 'rules-based reminders with invoice caps shared across entities',
  },
  quickbooks: {
    name: 'QuickBooks',
    pricing: '$0/mo extra, plus payment processing fees',
    builtFor: 'businesses already working inside QuickBooks',
    shape: 'basic built-in payment reminders',
  },
  upflow: {
    name: 'Upflow',
    pricing: 'not published, demo required',
    builtFor: 'B2B finance teams with CFOs, controllers and AR managers',
    shape: 'an AR collections platform',
  },
  zohobooks: {
    name: 'Zoho Books',
    pricing: 'tiered within the Zoho suite',
    builtFor: 'small businesses standardising on one Zoho suite',
    shape: 'invoicing and payment tracking inside Zoho',
  },
};

// FAQPage for a /vs-<slug> page. These pages are the highest-intent surfaces on
// the site and carried no FAQ markup at all, which matters more for answer
// engines than for Google: "cheapest Chaser alternative for a bookkeeping
// practice" is a question, and a page that answers questions in a machine-
// readable shape is the one that gets quoted.
export function comparisonFaqJsonLd(slug: string): JsonLdThing | null {
  const c = COMPETITORS[slug];
  if (!c) return null;
  const perBook = Math.round(PLAN_PRICING.growth.monthly / PRACTICE_INCLUDED_ORGS);
  return faqJsonLd([
    {
      q: `How much does ${BRAND} cost compared to ${c.name}?`,
      a:
        `${BRAND} is $${PLAN_PRICING.starter.monthly}/mo for a single business and ` +
        `$${PLAN_PRICING.growth.monthly}/mo for a practice covering up to ${PRACTICE_INCLUDED_ORGS} client ` +
        `organizations, which works out near $${perBook} per client book. There are no ` +
        `per-invoice, per-reminder or per-user fees. ${c.name} is ${c.pricing}.`,
    },
    {
      q: `Is ${BRAND} or ${c.name} better for a small agency or bookkeeping practice?`,
      a:
        `${c.name} is ${c.shape}, built for ${c.builtFor}. ${BRAND} is built for ` +
        `bookkeepers and accountants chasing AR across many client books, and for ` +
        `5-30 person agencies chasing their own. If you have a full-time credit ` +
        `controller and an ERP, ${c.name} is the more natural fit. If you do not, ` +
        `${BRAND} is priced and scoped for you.`,
    },
    {
      q: `What is the best ${c.name} alternative for chasing overdue invoices?`,
      a:
        `${BRAND} writes each reminder in context rather than filling a template, ` +
        `and stops the sequence automatically the moment a customer replies or pays. ` +
        `It extracts promised payment dates from replies and classifies disputes so ` +
        `they do not receive another chase. You connect Xero or QuickBooks with the provider's own sign-in.`,
    },
    {
      q: `Does ${BRAND} work with Xero and QuickBooks?`,
      a:
        `Xero OAuth sync is live. QuickBooks OAuth sync is in beta. ${BRAND} reads ` +
        `your invoices and customers, and never posts changes back without approval.`,
    },
    {
      q: `Can I switch from ${c.name} to ${BRAND}?`,
      a:
        `Yes. Migration is free and founder-assisted, and the 14-day trial needs no ` +
        `credit card, so you can run both in parallel before moving anything.`,
    },
  ]);
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
