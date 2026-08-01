import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import { pageMetadata, faqJsonLd, webPageJsonLd, softwareAppJsonLd } from '@/lib/seo';
import { CheckCircle2, ArrowRight, MessageSquare, ShieldCheck, FileText } from 'lucide-react';
import Link from 'next/link';

export const metadata = pageMetadata({
  title: 'A/R automation for UK agencies on Xero — founded-pilot offer',
  description:
    'AI-native accounts-receivable automation for UK agencies and consultancies ' +
    'on Xero. Built for the long tail: 5-30 person teams, monthly B2B invoices, ' +
    'no full-time credit controller. From £40/mo flat. Founder-assisted pilot.',
  path: '/for/uk-agencies',
  image: '/og-for-uk-agencies.png',
  keywords: [
    'AR automation UK agencies',
    'Xero invoice reminder UK',
    'late invoice payment UK agency',
    'UK SME debt recovery',
    'UK agency bookkeeping',
    'Small Business Commissioner',
    'UK Prompt Payment Code',
    'invoice chasing UK Xero',
  ],
});

// UK-specific landing page. Targeted at the 90-day plan beachhead.
// Uses GBP pricing (foundational conversion at $49 ≈ £40) and UK-specific
// payment rail cues (BACS) without violating any FCA / ICO guidance —
// Collectly does not chase consumers, only B2B invoices for SMBs.
const ukJsonLd = JSON.stringify([
  webPageJsonLd({
    title: 'A/R automation for UK agencies on Xero',
    description:
      'How Collectly handles accounts receivable for UK agencies and ' +
      'consultancies on Xero. BACS, Faster Payments, and GoCardless for ' +
      'branded payment portals. £40/mo founding-customer rate.',
    path: '/for/uk-agencies',
  }),
  softwareAppJsonLd(),
  faqJsonLd([
    {
      q: 'Why are UK agencies owed so much in unpaid invoices?',
      a: 'According to Xero\'s analysis of 440,000 UK small businesses in early ' +
         '2026, invoices take an average of 29 days to be paid and arrive 8.2 days ' +
         'after their due date. Total UK SMB-to-SMB debt is roughly £26 billion at ' +
         'any given time, contributing to the closure of around 14,000 UK ' +
         'businesses per year from payment delays alone.',
    },
    {
      q: 'Does Collectly replace the Prompt Payment Code or a debt-collector?',
      a: 'No. Collectly is an accounts-receivable automation tool for small ' +
         'businesses, not a substitute for formal commercial-debt recovery. The ' +
         'Prompt Payment Code, the Small Business Commissioner, and registered ' +
         'commercial-debt collection agencies are separate channels that we ' +
         'complement, not replace.',
    },
    {
      q: 'Can the chasing emails be sent from a UK-domain?',
      a: 'Yes. Most UK agencies route through their own domain (e.g. ' +
         'accounts@yourdomain.co.uk). Collectly uses Resend for transactional ' +
         'email. Domain authentication (SPF, DKIM, DMARC) is set during the ' +
         'founder-assisted onboarding as a required step before the first ' +
         'reminder goes out.',
    },
    {
      q: 'Does Collectly support UK-specific payment rails?',
      a: 'Yes. The branded payment portal supports BACS, Faster Payments, and ' +
         'GoCardless direct debit. Card payments are supported via Stripe. ' +
         'Settlement timing and fees follow your chosen processor.',
    },
    {
      q: 'Is Collectly GDPR-compliant for UK customers?',
      a: 'Yes. We are GDPR + UK GDPR compliant. Our DPA is published and includes ' +
         'Standard Contractual Clauses for any third-party sub-processors. Customer ' +
         'data is stored in EU regions by default; US-region storage is available ' +
         'on request.',
    },
    {
      q: 'How much does Collectly cost UK customers?',
      a: 'Founding-customer pricing is $49/mo flat (around £40/mo at current FX ' +
         'rates), billed in GBP via Stripe. No per-invoice fees, no setup fees, ' +
         'no SMS markup. Cancel any time. Founding pricing is locked for the ' +
         'first 20 customers for the life of their subscription.',
    },
  ]),
]);

export default function ForUkAgenciesPage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ukJsonLd }} />
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'For UK Agencies', path: '/for/uk-agencies' },
        ]}
      />
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">For UK agencies</p>
        <h1 className="mt-3 h1">A/R automation for UK agencies on Xero.</h1>
        <p className="mt-5 lead">
          Built for 5–30 person UK agencies and consultancies. Tone-aware AI
          dunning, reply-or-pay pause, BACS and Faster Payments in the branded
          payment portal, full GDPR / UK GDPR compliance. Founding-customer
          rate of £40/mo, locked for life for the first 20.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link href="/ar-audit" className="btn-primary inline-flex items-center gap-1.5">
            Get a free A/R health audit <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/playbook" className="btn-secondary inline-flex items-center gap-1.5">
            Download the 5-step playbook
          </Link>
        </div>
      </section>
      <section className="container-page pb-16">
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl">
          <div className="card">
            <MessageSquare className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">Built for UK cadence.</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              Net-30 is the UK norm but receipt-to-payment routinely runs 8+ days
              past the due date. Collectly reads the original Xero payment terms
              and adapts the cadence accordingly — friendlier on net-30 first
              touch, firmer on net-60 overdue buckets.
            </p>
          </div>
          <div className="card">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">GDPR + UK GDPR by default.</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              Customer data stored in EU regions. Sub-processors disclosed in a
              published DPA with Standard Contractual Clauses. Data subject
              requests handled within the 30-day statutory window.
            </p>
          </div>
          <div className="card">
            <FileText className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">BACS in the payment portal.</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              The branded payment portal supports BACS, Faster Payments,
              GoCardless Direct Debit, and card payments via Stripe. Settlement
              fees follow your chosen processor; we never mark up payment fees.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-ink-50 border-y border-ink-200">
        <div className="container-page py-16 max-w-3xl">
          <p className="eyebrow">What you get for £40/mo flat</p>
          <h2 className="mt-3 h2">Founding-customer offer, locked for life.</h2>
          <p className="mt-4 lead">
            The first 20 founding customers lock in the £40/mo rate for the life
            of their subscription. After the founding cohort closes, plans start
            at $99/mo per Xero organisation. Founding-customer billing is via
            Stripe in GBP; cancel any time.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink-700">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> One Xero organisation, up to 150 monitored invoices.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Tone-aware AI reminders with approval mode by default.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Reply-or-pay pause, promise-to-pay tracking, dispute classification.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Branded payment portal with BACS, Faster Payments, GoCardless.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> 4-week cash-flow forecast based on payment history.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Founder-assisted setup with domain authentication setup.</li>
          </ul>
          <div className="mt-8">
            <Link href="/ar-audit" className="btn-primary inline-flex items-center gap-1.5">
              Get a free A/R health audit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
