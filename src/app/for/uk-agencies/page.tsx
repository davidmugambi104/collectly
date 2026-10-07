import { billingCopy } from '@/lib/billing-copy';
import { stripeBillingStatus } from '@/lib/stripe-billing-config';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import { pageMetadata, faqJsonLd, webPageJsonLd, softwareAppJsonLd } from '@/lib/seo';
import { FaqSection, type FaqItem } from '@/components/marketing/faq-section';
import { PLAN_PRICING, FOUNDING, PRACTICE_INCLUDED_ORGS } from '@/lib/utils';
import { CheckCircle2, ArrowRight, MessageSquare, ShieldCheck, FileText } from 'lucide-react';
import Link from 'next/link';
import { TrackView } from '@/components/marketing/track-view';

// Module-local, not exported: a Next.js page may only carry the
// framework's own named exports. Both the FAQPage markup and the visible
// <FaqSection> read this one array.
const billing = billingCopy(stripeBillingStatus(process.env).checkoutReady);
const FAQS: FaqItem[] = [
    {
      q: 'Why are UK agencies owed so much in unpaid invoices?',
      a: 'According to Xero\'s analysis of 440,000 UK small businesses in early ' +
         '2026, invoices take an average of 29 days to be paid and arrive 8.2 days ' +
         'after their due date. Total UK SMB-to-SMB debt is roughly £26 billion at ' +
         'any given time, contributing to the closure of around 14,000 UK ' +
         'businesses per year from payment delays alone.',
    },
    {
      q: 'Does Mugavi replace the Prompt Payment Code or a debt-collector?',
      a: 'No. Mugavi is an accounts-receivable automation tool for small ' +
         'businesses, not a substitute for formal commercial-debt recovery. The ' +
         'Prompt Payment Code, the Small Business Commissioner, and registered ' +
         'commercial-debt collection agencies are separate channels that we ' +
         'complement, not replace.',
    },
    {
      q: 'Can the chasing emails be sent from a UK-domain?',
      a: 'Yes. Most UK agencies route through their own domain (e.g. ' +
         'accounts@yourdomain.co.uk). Mugavi uses Resend for transactional ' +
         'email. Domain authentication (SPF, DKIM, DMARC) is set during the ' +
         'founder-assisted onboarding as a required step before the first ' +
         'reminder goes out.',
    },
    {
      q: 'Does Mugavi support UK-specific payment rails?',
      a: 'Not yet. Customers pay through the payment page by wire transfer today, ' +
         'which works with UK bank accounts. Card and US bank (ACH) payments are built ' +
         'but switched off for now. There is no BACS, Faster Payments or direct debit ' +
         'option, and no date for adding one.',
    },
    {
      q: 'Is Mugavi GDPR-compliant for UK customers?',
      a: 'We publish a data processing agreement that covers GDPR and UK GDPR, ' +
         'with Standard Contractual Clauses for transfers. Customer data is ' +
         'processed in the United States today. The DPA page has the details.',
    },
    {
      q: 'How much does Mugavi cost UK customers?',
      a: `A single organisation is $${PLAN_PRICING.starter.monthly}/mo (around ` +
         `£${Math.round(PLAN_PRICING.starter.monthly * 0.8)}/mo at current FX rates) and a ` +
         `practice covering up to ${PRACTICE_INCLUDED_ORGS} client books is ` +
         `$${PLAN_PRICING.growth.monthly}/mo, in US dollars. ${billing.checkoutReady ? billing.howBillingWorks : 'Billing is a manual invoice for everyone today and card checkout is not switched on yet.'} No per-invoice ` +
         `fees, no setup fees, no SMS markup. Cancel any time. The first ${FOUNDING.seats} ` +
         `founding customers take ${FOUNDING.discountPct}% off for ${FOUNDING.months} months.`,
    },
  ];

export const metadata = pageMetadata({
  title: 'A/R automation for UK agencies on Xero: founded-pilot offer',
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
// Uses GBP pricing (roughly 0.80 GBP to the USD at time of writing) and UK-specific
// payment wording without violating any FCA / ICO guidance —
// Mugavi does not chase consumers, only B2B invoices for SMBs.
const ukJsonLd = JSON.stringify([
  webPageJsonLd({
    title: 'A/R automation for UK agencies on Xero',
    description:
      'How Mugavi handles accounts receivable for UK agencies and ' +
      'consultancies on Xero. A payment page for your customers. £40/mo founding-customer rate.',
    path: '/for/uk-agencies',
  }),
  softwareAppJsonLd(),
  faqJsonLd(FAQS),
]);

export default function ForUkAgenciesPage() {
  return (
    <div className="min-h-screen">
      <TrackView event="audience_page_view" eventProps={{ audience: 'uk-agencies' }} />
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
          Built for 5-30 person UK agencies and consultancies. Tone-aware AI
          dunning, reply-or-pay pause, a branded payment page, and a published
          GDPR / UK GDPR data processing agreement. From
          £{Math.round(PLAN_PRICING.starter.monthly * 0.8)}/mo, with {FOUNDING.discountPct}% off
          for {FOUNDING.months} months for the first {FOUNDING.seats} founding customers.
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
              past the due date. Mugavi reads the original Xero payment terms
              and adapts the cadence accordingly: friendlier on net-30 first
              touch, firmer on net-60 overdue buckets.
            </p>
          </div>
          <div className="card">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">GDPR + UK GDPR data processing agreement.</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              Customer data is processed in the United States. Sub-processors are disclosed in a
              published DPA with Standard Contractual Clauses. Data subject
              requests handled within the 30-day statutory window.
            </p>
          </div>
          <div className="card">
            <FileText className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">Paying by bank transfer.</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              Customers pay through the payment page by wire transfer, which works with UK
              bank accounts. Card and ACH are built but switched off for now. There is no BACS,
              Faster Payments or direct debit option yet.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-ink-50 border-y border-ink-200">
        <div className="container-page py-16 max-w-3xl">
          <p className="eyebrow">What you get for £40/mo flat</p>
          <h2 className="mt-3 h2">Founding-customer offer.</h2>
          <p className="mt-4 lead">
            The first {FOUNDING.seats} founding customers take {FOUNDING.discountPct}% off
            for {FOUNDING.months} months, ${FOUNDING.monthly('growth')}/mo for a practice
            covering up to {PRACTICE_INCLUDED_ORGS} client organisations, then
            ${PLAN_PRICING.growth.monthly}/mo. A single organisation is
            ${PLAN_PRICING.starter.monthly}/mo. Prices are in US dollars, {billing.forPagesLine}. Cancel any time.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink-700">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> One Xero organisation, unlimited invoices.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Tone-aware AI reminders with approval mode by default.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Reply-or-pay pause, promise-to-pay tracking, dispute classification.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Branded payment portal. Payment methods depend on your region and provider approval.</li>
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
      <FaqSection items={FAQS} title="UK agency A/R questions" />
      <MarketingFooter />
    </div>
  );
}
