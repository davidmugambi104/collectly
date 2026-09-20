import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Fraunces } from 'next/font/google';
import './globals.css';

import { PostHogProvider } from '@/components/posthog-provider';
import { ClerkProvider } from '@/components/clerk-provider';
import { Suspense } from 'react';
import { orgJsonLd, softwareAppJsonLd, SITE, BRAND, TAGLINE } from '@/lib/seo';
import { PLAN_PRICING } from '@/lib/utils';
import { ConsentProvider } from '@/components/consent/consent-provider';
import { GatedScripts } from '@/components/consent/gated-scripts';
import { ConsentBanner } from '@/components/consent/consent-banner';

// tailwind.config.ts has always named Inter and JetBrains Mono as the brand
// faces, and globals.css sets Inter-specific OpenType features ("ss01",
// "cv11") — but nothing ever loaded either font. There was no next/font call,
// no <link> to Google Fonts, no @font-face and no files in public/, so every
// client silently fell back down the stack: SF Pro on macOS, Segoe UI on
// Windows, Roboto on Android. font-display and font-sans resolved to the same
// face, making the display/body distinction a no-op, and the financial figures
// marked font-mono lost JetBrains Mono's fixed advance width, which is what
// keeps the currency columns in the dashboard tables optically aligned.
// next/font self-hosts both at build time, so there is no runtime request to
// Google, no extra CSP origin, and no layout shift.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

// A real display face. font-display and font-sans were BOTH var(--font-inter),
// so every headline on the site was Inter Bold sitting over Inter Regular —
// which is, precisely, what a Tailwind starter looks like. One editorial face
// used only for h1/h2 is the cheapest change on the site that reads as
// "designed"; Inter keeps everything else. Fraunces is variable, so this costs
// one file, and swapping it is one identifier here plus one in tailwind.config.
const fraunces = Fraunces({
  subsets: ['latin'],
  // No `axes` here: next/font rejects axes alongside an explicit weight list
  // ("Axes can only be defined for variable fonts when the weight property is
  // nonexistent or set to `variable`"). Two static weights is all the display
  // face needs, and it keeps the payload smaller than shipping the full
  // variable range for two headline levels.
  weight: ['600', '700'],
  style: ['normal'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://mugavi.com'),
  title: { default: 'Mugavi — AR automation for small agencies on Xero & QuickBooks', template: '%s · Mugavi' },
  description:
    'Mugavi is the accounts-receivable automation tool for 5-30 person agencies and consultancies. It drafts client-safe invoice reminders, pauses when a customer replies or pays, tracks promised-payment dates, and separates disputes from ordinary late payment. Built for Xero and QuickBooks. From $' + PLAN_PRICING.starter.monthly + '/mo.',
  keywords: [
    'Xero invoice reminder', 'accounts receivable automation',
    'AR automation for agencies', 'Chaser alternative',
    'invoice chasing software', 'AI dunning',
    'small business cash flow', 'promise to pay tracking',
    'QuickBooks AR', 'Xero AR', 'agency operations',
  ],
  authors: [{ name: 'Davie', url: 'https://mugavi.com' }],
  creator: 'Davie',
  publisher: 'Mugavi',
  category: 'Business Software',
  applicationName: 'Mugavi',
  referrer: 'origin-when-cross-origin',
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    title: 'Mugavi — AR automation for small agencies on Xero & QuickBooks',
    description:
      `AI-native AR for agencies, consultancies and bookkeeping practices. Tone-aware email + SMS dunning on Xero and QuickBooks. From $${PLAN_PRICING.starter.monthly}/mo, no per-invoice fees.`,
    url: 'https://mugavi.com',
    siteName: 'Mugavi — AR automation for agencies',
    images: [
      { url: '/og.png', width: 1200, height: 630, alt: 'Mugavi — AR automation for small agencies on Xero & QuickBooks' },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mugavi — AR automation for agencies',
    description:
      `AI-native AR for agencies, consultancies and bookkeeping practices on Xero & QuickBooks. From $${PLAN_PRICING.starter.monthly}/mo.`,
    images: ['/og.png'],
    // See the note in src/lib/seo.ts -- a social handle, not a domain. Held
    // until the new handle is actually registered.
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
    canonical: 'https://mugavi.com',
    languages: { 'en-US': 'https://mugavi.com' },
    types: {
      'application/rss+xml': [
        { url: 'https://mugavi.com/rss.xml', title: 'Mugavi blog' },
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
    // Read from env, not committed. This repo is public, and the note above
    // said so before the token was hardcoded here anyway. Bing's was already
    // env-driven; Google's is now too.
    //
    // The previously committed value is exposed in git history and cannot be
    // un-leaked by deleting this line, so it should be rotated in Search
    // Console: remove the property's verification, re-verify, and update
    // NEXT_PUBLIC_GSC_TOKEN. Practical risk is low -- a token only grants
    // ownership to someone who can also serve it on the domain -- but it is a
    // secret that is public, and it costs nothing to replace.
    //
    // mugavi.com is verified as a DOMAIN property via a DNS TXT record
    // instead, so it needs no meta tag here at all.
    // Comma-separated: both domains serve this same app, and each Search
    // Console property has its own token. Serving both tags keeps
    // getcollectly.app's meta verification alive while mugavi.com is verified,
    // rather than one silently replacing the other. getcollectly.app is also
    // DNS-verified, so it would survive either way -- but a property that
    // depends on a single method is one edit from unverified.
    google: (process.env.NEXT_PUBLIC_GSC_TOKEN ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
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
    <html lang="en-GB" className={`${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}>
      <head>
        <script
          type="application/ld+json"
          // server-rendered once; safe to dangerouslySetInnerHTML because the
          // content is built in this module from a typed builder, not user input.
          dangerouslySetInnerHTML={{ __html: siteJsonLd }}
        />
      </head>
      <body>
        {/* First focusable thing in the document, so a keyboard or screen-reader
            visitor can jump the nav instead of tabbing it on every page.
            Invisible until focused. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          Skip to content
        </a>
        {/* Third-party scripts live in GatedScripts and mount only once the
            visitor has allowed them. Nothing non-essential is in the document
            before that: AdSense and Clarity both set cookies on load, and the
            site is en-GB with areaServed GB, so PECR reg. 6 applies. */}
        <ConsentProvider>
          <GatedScripts />
          <ClerkProvider>
            <Suspense>
              {/* The one <main> landmark for every route. 34 of 37 public pages
                  had none, and no layout supplied one, so assistive tech had
                  nothing to jump to. Pages must not add their own -- a second
                  <main> in the document is invalid and breaks the landmark. */}
              <main id="main-content">
                <PostHogProvider>{children}</PostHogProvider>
              </main>
            </Suspense>
          </ClerkProvider>
          <ConsentBanner />
        </ConsentProvider>
      </body>
    </html>
  );
}
