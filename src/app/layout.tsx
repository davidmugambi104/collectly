import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PostHogProvider } from '@/components/posthog-provider';
import { ClerkProvider } from '@/components/clerk-provider';
import { Suspense } from 'react';
import { orgJsonLd, softwareAppJsonLd, SITE, BRAND, TAGLINE } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcollectly.app'),
  title: { default: 'Collectly — AR automation for small agencies on Xero & QuickBooks', template: '%s · Collectly' },
  description:
    'Collectly is the accounts-receivable automation tool for 5-30 person agencies and consultancies. It drafts client-safe invoice reminders, pauses when a customer replies or pays, tracks promised-payment dates, and separates disputes from ordinary late payment. Built for Xero and QuickBooks. From $49/mo flat.',
  keywords: [
    'Xero invoice reminder', 'accounts receivable automation',
    'AR automation for agencies', 'Chaser alternative',
    'invoice chasing software', 'AI dunning',
    'small business cash flow', 'promise to pay tracking',
    'QuickBooks AR', 'Xero AR', 'agency operations',
  ],
  authors: [{ name: 'Davie', url: 'https://getcollectly.app' }],
  creator: 'Davie',
  publisher: 'Collectly',
  category: 'Business Software',
  applicationName: 'Collectly',
  referrer: 'origin-when-cross-origin',
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    title: 'Collectly — AR automation for small agencies on Xero & QuickBooks',
    description:
      'AI-native AR for 5-30 person agencies and consultancies. Tone-aware email + SMS dunning on Xero and QuickBooks. From $49/mo flat, no per-invoice fees.',
    url: 'https://getcollectly.app',
    siteName: 'Collectly — AR automation for agencies',
    images: [
      { url: '/og.png', width: 1200, height: 630, alt: 'Collectly — AR automation for small agencies on Xero & QuickBooks' },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Collectly — AR automation for agencies',
    description:
      'AI-native AR for 5-30 person agencies and consultancies on Xero & QuickBooks. From $49/mo flat.',
    images: ['/og.png'],
    creator: '@getcollectly',
    site: '@getcollectly',
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: 'https://getcollectly.app',
    languages: { 'en-US': 'https://getcollectly.app' },
    types: {
      'application/rss+xml': [
        { url: 'https://getcollectly.app/rss.xml', title: 'Collectly blog' },
      ],
    },
  },
  // Search engine webmaster verification tokens.
  // Google Search Console: https://search.google.com/search-console/
  //   - Verification is via meta tag — paste the content= value here.
  //   - After verification, submit /sitemap.xml from the GSC UI.
  // Bing Webmaster Tools: https://www.bing.com/webmasters
  //   - Verification is also via meta tag (msvalidate.01).
  //   - After verification, submit /rss.xml AND /sitemap.xml — Bing indexes
  //     RSS much faster than XML sitemaps and treats it as a freshness signal.
  //
  // IMPORTANT: Never commit the verified token to public repos — tokens map
  // to the account that owns the property. If we go open-source, move these
  // to env (NEXT_PUBLIC_GSC_TOKEN / NEXT_PUBLIC_BING_TOKEN) at deploy time.
  verification: {
    google: 'PtjQY7SHV7PPDNQaeXMj7kKYyqfIsV7eZvhXenPzRL8',
    other: process.env.NEXT_PUBLIC_BING_TOKEN
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_TOKEN }
      : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0b0f',
  width: 'device-width',
  initialScale: 1,
};

// Site-wide JSON-LD. Renders Organization, SoftwareApplication, and WebSite
// (with SearchAction) on every page. Per-page schemas (Product, FAQPage,
// BreadcrumbList, BlogPosting) ride alongside this baseline. Purposefully
// injected as a <script> tag because next/script's "beforeInteractive"
// placement causes hydration warnings for type='application/ld+json'.
const siteJsonLd = JSON.stringify([
  orgJsonLd(),
  softwareAppJsonLd(),
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: `${BRAND} — ${TAGLINE}`,
    url: SITE.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/blog?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  },
]);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <script
          type="application/ld+json"
          // server-rendered once; safe to dangerouslySetInnerHTML because the
          // content is built in this module from a typed builder, not user input.
          dangerouslySetInnerHTML={{ __html: siteJsonLd }}
        />
      </head>
      <body>
        <ClerkProvider>
          <Suspense>
            <PostHogProvider>{children}</PostHogProvider>
          </Suspense>
        </ClerkProvider>
      </body>
    </html>
  );
}
