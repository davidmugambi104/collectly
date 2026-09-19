import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import { pageMetadata, faqJsonLd, webPageJsonLd, softwareAppJsonLd } from '@/lib/seo';
import { FaqSection, type FaqItem } from '@/components/marketing/faq-section';
import { PLAN_PRICING, PRACTICE_INCLUDED_ORGS } from '@/lib/utils';
import { CheckCircle2, ArrowRight, MessageSquare, ShieldCheck, FileText } from 'lucide-react';
import Link from 'next/link';

// Module-local, not exported: a Next.js page may only carry the
// framework's own named exports. Both the FAQPage markup and the visible
// <FaqSection> read this one array.
const FAQS: FaqItem[] = [
    {
      q: 'How is consultancy invoicing different from agency invoicing?',
      a: 'Consultancies and boutique advisory firms typically invoice on longer ' +
         'cycles (net 30, net 60, monthly retainers, project milestones) and ' +
         'have a smaller number of higher-value invoices per customer. Mugavi ' +
         'treats each invoice individually, reads the original payment terms ' +
         'from Xero, and adapts the dunning cadence to the longer cycle.',
    },
    {
      q: 'Does Mugavi handle retainer invoices differently from project invoices?',
      a: 'Yes. Recurring retainer customers can be flagged once; Mugavi then ' +
         'remembers their cadence, typical payment window, and any exclusions ' +
         'across all subsequent invoices. Project milestone invoices stay ' +
         'per-invoice so that a milestone dispute does not poison the broader ' +
         'customer relationship.',
    },
    {
      q: 'Can Mugavi keep track of CFO or fractional-finance escalations?',
      a: 'Yes. You can configure per-customer exclusions for "any invoice ' +
         'over $X goes to manual review" and "any invoice over 90 days goes to ' +
         'manual review." These work in approval mode and serve as the ' +
         'escalation layer for senior team members.',
    },
    {
      q: 'How does Mugavi work with our bookkeeper or fractional CFO?',
      a: 'Your bookkeeper or fractional CFO gets a read-only seat on the ' +
         'Mugavi dashboard at no additional cost on the founding-customer ' +
         'plan. They can review approvals, see dispute classifications, and ' +
         'audit the sequence without sending emails themselves.',
    },
    {
      q: 'Will Mugavi break confidentiality for our client list?',
      a: 'No. Mugavi never sends AR data to a third party. We do not train ' +
         'AI models on customer data. See the public AI-data disclosure in our ' +
         'security page for the full scope of what is and is not used.',
    },
  ];

export const metadata = pageMetadata({
  title: 'A/R automation for consultancies on Xero — founder-assisted pilot',
  description:
    'Built for 5-30 person consultancies and boutique advisory firms on Xero. ' +
    'AI tone-aware dunning, reply-or-pay pause, promise-to-pay tracking, and ' +
    `dispute classification — from $${PLAN_PRICING.starter.monthly}/mo. Founder-assisted onboarding for ` +
    'agencies, consultancies and bookkeeping practices.',
  path: '/for/consultancies',
  keywords: [
    'AR automation for consultancies',
    'consulting invoice reminder',
    'consultancy bookkeeping Xero',
    'boutique advisory A/R',
    'consulting firm late invoice',
    'professional services finance',
  ],
});

const consultanciesJsonLd = JSON.stringify([
  webPageJsonLd({
    title: 'A/R automation for consultancies on Xero',
    description:
      'How Mugavi handles accounts receivable for 5-30 person consultancies ' +
      'and boutique advisory firms on Xero and QuickBooks.',
    path: '/for/consultancies',
  }),
  softwareAppJsonLd(),
  faqJsonLd(FAQS),
]);

export default function ForConsultanciesPage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: consultanciesJsonLd }} />
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'For Consultancies', path: '/for/consultancies' },
        ]}
      />
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">For consultancies</p>
        <h1 className="mt-3 h1">A/R automation for consultancies on Xero.</h1>
        <p className="mt-5 lead">
          Built for 5–30 person consultancies and boutique advisory firms on Xero.
          Tone-aware AI reminders, reply-or-pay pause, promise-to-pay tracking, and
          dispute classification. Founder-assisted onboarding. ${PLAN_PRICING.starter.monthly}/mo
          for one organization; ${PLAN_PRICING.growth.monthly}/mo for a practice covering
          up to {PRACTICE_INCLUDED_ORGS} client books.
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
            <h2 className="mt-3 text-lg font-semibold text-ink-900">
              Conservative by default.
            </h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              Approval mode is on for every founding customer. Nothing goes out
              until a human reviews it. Autopilot unlocks only after 25 reviewed
              messages with no unedited-send rate over a 14-day window.
            </p>
          </div>
          <div className="card">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">
              Confidentiality-first.
            </h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              We never send AR data to third parties. We do not train models on
              customer data. Customer data is processed for inference only, never
              stored beyond what the in-app approval history requires.
            </p>
          </div>
          <div className="card">
            <FileText className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">
              Reads your Xero payment terms.
            </h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              The dunning cadence is per-invoice and reads the original terms
              from the Xero invoice. Net-60 customer? Mugavi adapts without
              a single configuration change.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-ink-50 border-y border-ink-200">
        <div className="container-page py-16 max-w-3xl">
          <p className="eyebrow">For fractional finance teams</p>
          <h2 className="mt-3 h2">Pair Mugavi with a fractional CFO.</h2>
          <p className="mt-4 lead">
            If you already work with a fractional CFO or outsourced bookkeeping
            provider, they get a free read-only seat on Mugavi from the
            founding-customer plan. They review approvals, see dispute
            classifications, and audit the sequence. You keep the senior
            escalation layer with the right person in the loop.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink-700">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Read-only seat for bookkeeper / fractional CFO at no charge.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Per-customer exclusion list for strategic accounts.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Audit log for every approved, sent, paused, edited action.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> SOC 2-ready permission model.</li>
          </ul>
          <div className="mt-8">
            <Link href="/ar-audit" className="btn-primary inline-flex items-center gap-1.5">
              Get a free A/R health audit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <FaqSection items={FAQS} title="Consultancy A/R questions" />
      <MarketingFooter />
    </div>
  );
}
