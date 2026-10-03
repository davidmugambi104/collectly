import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import { pageMetadata, faqJsonLd, webPageJsonLd, softwareAppJsonLd } from '@/lib/seo';
import { FaqSection, type FaqItem } from '@/components/marketing/faq-section';
import { PLAN_PRICING, PRACTICE_INCLUDED_ORGS } from '@/lib/utils';
import { CheckCircle2, Sparkles, ArrowRight, ShieldCheck, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { TrackView } from '@/components/marketing/track-view';

// Module-local, not exported: a Next.js page may only carry the
// framework's own named exports. Both the FAQPage markup and the visible
// <FaqSection> read this one array.
const FAQS: FaqItem[] = [
    {
      q: 'How much time will this save an agency?',
      a: 'It depends on how many invoices you chase, and we do not yet have ' +
         'customer data to quote a number. What changes is the kind of work: ' +
         'Mugavi drafts each reminder and you review a queue and approve it, ' +
         'instead of writing every email from scratch. You can see what it ' +
         'would send before you rely on it.',
    },
    {
      q: 'How does Mugavi handle project milestone invoices?',
      a: 'Each invoice, whether a recurring retainer or a project milestone, ' +
         'follows the schedule for its customer. You choose the timing and ' +
         'tone of every step, and customer groups let you put milestone ' +
         'customers on a separate schedule from retainer customers. A customer ' +
         'with several overdue invoices gets one reminder that lists them.',
    },
    {
      q: 'Will Mugavi send reminders to clients we want to keep close?',
      a: 'Only if you let it. Every reminder waits for your approval by ' +
         'default, and you can pause automatic reminders for any customer, ' +
         'until a date you choose or until you switch them back on. While a ' +
         'customer is paused, Mugavi drafts nothing for them.',
    },
    {
      q: 'Does this work for agencies on net-30 or net-60 terms?',
      a: 'Both. Reminders are timed from each invoice\'s due date, which ' +
         'comes from Xero, so a net-60 invoice is not chased at day 30. You ' +
         'set the steps and their tone, and a customer group can have its own ' +
         'schedule with a longer gap before the firm stage.',
    },
    {
      q: 'How does Mugavi handle retainer continuity disputes?',
      a: 'When a customer replies "we cancelled the retainer last month," ' +
         'Mugavi classifies the reply as a blocker (not a promise-to-pay), ' +
         'pauses reminders on that invoice, and surfaces it in your disputes ' +
         'worklist so the team can resolve the dispute (often: confirm the ' +
         'cancellation date, update Xero, and write off or refund as needed).',
    },
  ];

export const metadata = pageMetadata({
  title: 'A/R automation for agencies on Xero: stop chasing invoices',
  description:
    'AR automation built for 5-30 person agencies and consultancies on Xero. ' +
    'Tone-aware AI reminders, reply-or-pay pause, promise-to-pay tracking, and ' +
    `dispute classification: from $${PLAN_PRICING.starter.monthly}/mo.`,
  path: '/for/agencies',
  keywords: [
    'AR automation for agencies',
    'Xero invoice reminder agency',
    'agency accounts receivable',
    'design agency invoice chasing',
    'marketing agency AR tool',
    'agency bookkeeping',
    'small agency finance',
  ],
});

// Industry landing page. Same SoftwareApplication as the root, scoped
// to the agency vertical. FAQ targets the long-tail queries people search
// before adopting an A/R tool inside an agency.
const agenciesJsonLd = JSON.stringify([
  webPageJsonLd({
    title: 'A/R automation for agencies on Xero',
    description:
      'How Mugavi handles accounts receivable for 5-30 person agencies: ' +
      'tone-aware AI reminders, Xero integration, reply-or-pay pause, and ' +
      'promise-to-pay tracking.',
    path: '/for/agencies',
  }),
  softwareAppJsonLd(),
  faqJsonLd(FAQS),
]);

export default function ForAgenciesPage() {
  return (
    <div className="min-h-screen">
      <TrackView event="audience_page_view" eventProps={{ audience: 'agencies' }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: agenciesJsonLd }} />
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'For Agencies', path: '/for/agencies' },
        ]}
      />
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">For agencies</p>
        <h1 className="mt-3 h1">A/R automation for agencies on Xero.</h1>
        <p className="mt-5 lead">
          Built for 5–30 person agencies and consultancies on Xero. Tone-aware AI
          reminders that draft, route, pause on reply, and track promised-pay dates.
          Founder-assisted setup, no per-invoice fees, ${PLAN_PRICING.starter.monthly}/mo
          for a single business and ${PLAN_PRICING.growth.monthly}/mo for a practice
          covering up to {PRACTICE_INCLUDED_ORGS} client books.
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
            <h2 className="mt-3 text-lg font-semibold text-ink-900">Pause on reply. Always.</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              Agency clients pay slowly, not never. When they reply to a reminder,
              Mugavi pauses the sequence and surfaces the conversation for human
              follow-up. The worst thing an A/R tool can do is double-chase a
              customer who is already paying.
            </p>
          </div>
          <div className="card">
            <Sparkles className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">Tone matches the relationship.</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              Strategic accounts get friendly. New clients get firm. Long-overdue
              accounts get a final-touch before human handoff. Tone rules are
              per-customer and per-customer-stage: you set them once, Mugavi
              follows them.
            </p>
          </div>
          <div className="card">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">Leaves your important accounts to you.</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              Some customers should never get an automatic reminder. Pause a
              strategic account until a date you choose, or until you resume,
              and handle it yourself. Disputed invoices, and any invoice with an
              unread customer reply, stay out of the schedule too.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-ink-50 border-y border-ink-200">
        <div className="container-page py-16 max-w-3xl">
          <p className="eyebrow">Why agencies pick Mugavi over Chaser and BILL</p>
          <h2 className="mt-3 h2">Built for the SMB agency long tail.</h2>
          <p className="mt-4 lead">
            Chaser is templated reminders starting around $259/mo for one
            organization. BILL bundles AP, AR, and spend at $49 per user/month plus
            transaction fees. Neither is wrong: they&apos;re just priced and
            positioned for different teams. Mugavi prices per client book, which
            works out near ${Math.round(PLAN_PRICING.growth.monthly / PRACTICE_INCLUDED_ORGS)}/mo
            a book for a practice.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink-700">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> One Xero organization, unlimited invoices, ${PLAN_PRICING.starter.monthly}/mo.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Approval mode is the default. You choose when, or whether, to switch to automatic sending.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Tone-aware AI writes each reminder; you edit before sending.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Reply-or-pay pause: the sequence stops the moment a customer responds.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Disputes auto-classified; the customer never sees another embarrassing generic chase.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> 4-week cash-flow forecast, based on payment history and promised pay dates.</li>
          </ul>
          <div className="mt-8">
            <Link href="/ar-audit" className="btn-primary inline-flex items-center gap-1.5">
              Get a free A/R health audit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <FaqSection items={FAQS} title="Agency A/R questions" />
      <MarketingFooter />
    </div>
  );
}
