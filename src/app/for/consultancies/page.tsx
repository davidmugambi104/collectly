import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import { pageMetadata, faqJsonLd, webPageJsonLd, softwareAppJsonLd } from '@/lib/seo';
import { FaqSection, type FaqItem } from '@/components/marketing/faq-section';
import { PLAN_PRICING, PRACTICE_INCLUDED_ORGS } from '@/lib/utils';
import { CheckCircle2, ArrowRight, MessageSquare, ShieldCheck, FileText } from 'lucide-react';
import Link from 'next/link';
import { TrackView } from '@/components/marketing/track-view';

// Module-local, not exported: a Next.js page may only carry the
// framework's own named exports. Both the FAQPage markup and the visible
// <FaqSection> read this one array.
const FAQS: FaqItem[] = [
    {
      q: 'How is consultancy invoicing different from agency invoicing?',
      a: 'Consultancies and boutique advisory firms typically invoice on longer ' +
         'cycles (net 30, net 60, monthly retainers, project milestones) and ' +
         'have a smaller number of higher-value invoices per customer. Mugavi ' +
         'treats each invoice individually and times its reminders from that ' +
         "invoice's due date, which comes from Xero. A net-60 invoice is not " +
         'chased at day 30, and you can give long-cycle customers their own ' +
         'schedule with customer groups.',
    },
    {
      q: 'Does Mugavi handle retainer invoices differently from project invoices?',
      a: 'You can put recurring retainer customers in a group, and a group ' +
         'has its own reminder schedule, so retainer customers can follow a ' +
         'gentler one than project customers. Each invoice is still handled ' +
         'on its own, and a customer with several overdue invoices gets one ' +
         'reminder that lists them, not one per invoice. A disputed invoice ' +
         'is left out of reminders.',
    },
    {
      q: 'Can Mugavi help with senior follow-ups on important accounts?',
      a: 'In part. You can pause automatic reminders for a customer you are ' +
         'handling yourself, add a call step to a schedule so a task lands on ' +
         'your list (and give it to a teammate), and send a later reminder ' +
         'under a different name, for example a partner. Mugavi does not yet ' +
         'have rules such as "any invoice over a set amount goes to manual ' +
         'review": approval is on or off for the whole account.',
    },
    {
      q: 'How does Mugavi work with our bookkeeper or fractional CFO?',
      a: 'You can add them to your Mugavi workspace as a team member. Anyone ' +
         'you add has the same access as you, because Mugavi does not have a ' +
         'read-only role yet, so add only people you would trust to approve ' +
         'reminders. They can review approvals, see dispute classifications, ' +
         'and look at the activity log.',
    },
    {
      q: 'Will Mugavi break confidentiality for our client list?',
      a: 'We never train AI models on your data. To write a reminder or ' +
         'classify a reply, Mugavi sends the minimum context needed (for ' +
         'example the invoice number, amount and days overdue) to Google ' +
         'Gemini, and does not ask it to retain anything. See the security ' +
         'page for the full scope of what is and is not used.',
    },
  ];

export const metadata = pageMetadata({
  title: 'A/R automation for consultancies on Xero: assisted pilot',
  description:
    'Built for 5-30 person consultancies and boutique advisory firms on Xero. ' +
    'AI tone-aware dunning, reply-or-pay pause, promise-to-pay tracking, and ' +
    `dispute classification: from $${PLAN_PRICING.starter.monthly}/mo. Founder-assisted onboarding for ` +
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
      <TrackView event="audience_page_view" eventProps={{ audience: 'consultancies' }} />
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
              Approval mode is on by default. Mugavi drafts each reminder and
              nothing goes out until a person approves it. You can switch an
              account to automatic sending yourself, and back again, any time.
            </p>
          </div>
          <div className="card">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">
              Confidentiality-first.
            </h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              We never train models on your data. To write a reminder we send
              Google Gemini only the context it needs, and we do not ask it to
              keep anything. The security page lists exactly what is used.
            </p>
          </div>
          <div className="card">
            <FileText className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">
              Reads your Xero payment terms.
            </h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              Reminders are timed from each invoice's due date, which comes
              from Xero, so a net-60 invoice is not chased early. Give a
              slow-paying customer their own schedule with a customer group.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-ink-50 border-y border-ink-200">
        <div className="container-page py-16 max-w-3xl">
          <p className="eyebrow">For fractional finance teams</p>
          <h2 className="mt-3 h2">Working with a fractional CFO or bookkeeper.</h2>
          <p className="mt-4 lead">
            If you already work with a fractional CFO or outsourced bookkeeping
            provider, you can add them to your workspace. They can review
            approvals, see dispute classifications, and read the activity log.
            Mugavi has no read-only role yet, so they get the same access you
            do. Nothing goes to a customer until a person approves it.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink-700">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Add your bookkeeper or fractional CFO to the workspace (full access: there is no read-only role yet).</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Pause automatic reminders for any strategic account you are handling yourself.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> An activity log of what was drafted, approved, sent and paused.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Give a call task to a teammate, and send a later reminder under a partner&apos;s name.</li>
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
