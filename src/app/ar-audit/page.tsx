import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { AuditForm } from '@/components/marketing/audit-form';
import { CheckCircle2, ShieldCheck, Clock, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { pageMetadata, faqJsonLd } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Free A/R health audit — find what\'s slowing your cash flow',
  description:
    'Get a free A/R health audit in 24 hours. No sales call, no pitch. ' +
    'We analyze your outstanding invoices, DSO, and collections workflow ' +
    'and reply with 3 specific things slowing your cash flow. Built for ' +
    '5-30 person agencies and consultancies on Xero.',
  path: '/ar-audit',
  image: '/og-ar-audit.png',
  keywords: [
    'AR audit', 'A/R health check', 'small business cash flow audit',
    'Xero collections review', 'cash flow analysis',
  ],
});

// FAQ JSON-LD captures the 5 questions people always ask before handing
// over their accounting data. Aimed at the "people also ask" rich result
// for "free AR audit" / "AR audit template" type queries.
const arAuditJsonLd = JSON.stringify(
  faqJsonLd([
    {
      q: 'Is the A/R audit really free?',
      a: 'Yes, no obligation. We send a one-page report with 3 specific findings ' +
         'and the single highest-ROI action you can take this week.',
    },
    {
      q: 'Do I need to share my Xero login?',
      a: 'No. The audit needs aging and outstanding-invoice totals, which are ' +
         'collectable from your own records without sharing credentials. We do ' +
         'not request screen-sharing access as part of the audit.',
    },
    {
      q: 'How long does the audit take?',
      a: 'You spend 10 minutes filling in the form. We reply within 24 business ' +
         'hours with the one-page report.',
    },
    {
      q: 'Will you try to sell me Collectly after the audit?',
      a: 'Only if we have a credible case study or product behaviour that ' +
         'matches what your audit reveals. If the report says the right move ' +
         'is a different tool, or no tool at all, we say so. We do not run a ' +
         'follow-up nurture sequence.',
    },
    {
      q: 'What do you do with the data you collect?',
      a: 'We use it once, to produce the audit, then delete the source data ' +
         'within 30 days. If you opt into a Collectly trial during the audit, ' +
         'your data is reused under the Collectly privacy policy. Otherwise, ' +
         'it is purged.',
    },
  ]),
);

const PROMISES = [
  {
    icon: Clock,
    title: 'Reply within 24 hours',
    body: 'We review your snapshot manually and send a short, actionable report — usually the same day.',
  },
  {
    icon: ShieldCheck,
    title: 'No pitch, no spam',
    body: 'The audit is free and independent. We will mention Collectly, but only if it genuinely fits your workflow.',
  },
  {
    icon: Sparkles,
    title: 'Three specific fixes',
    body: 'Not generic advice. We tell you exactly what to change in your follow-up timing, tone, or payment setup.',
  },
];

const TRIGGERS = [
  'Invoices regularly sit 30+ days unpaid',
  'You dread sending payment reminders',
  'Cash flow feels unpredictable month to month',
  'You use QuickBooks, Xero, FreshBooks, or spreadsheets',
  'Your team is 5-30 people, an agency or consultancy',
];

export default function ArAuditPage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: arAuditJsonLd }} />
      <MarketingHeader />

      <section className="container-tight py-16">
        <div className="max-w-2xl mx-auto text-center">
          <p className="eyebrow">Free A/R health audit</p>
          <h1 className="mt-3 h1">Find out why your cash flow feels stuck — in 2 minutes</h1>
          <p className="mt-5 lead">
            Send us a snapshot of your A/R. We will reply within 24 hours with 3 specific things slowing your collections —
            and what to do about each one. No sales call. No credit card. No fake case studies.
          </p>
        </div>

        <div className="mt-10 grid lg:grid-cols-5 gap-8 max-w-5xl mx-auto items-start">
          <div className="lg:col-span-3 card-lg">
            <AuditForm />
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <div className="text-sm font-semibold text-ink-900 mb-3">This audit is for you if:</div>
              <ul className="space-y-2.5 text-sm text-ink-700">
                {TRIGGERS.map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {PROMISES.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="card">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 grid place-items-center shrink-0">
                      <Icon className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-ink-900 text-sm">{p.title}</div>
                      <p className="mt-1 text-sm text-ink-600">{p.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="card bg-ink-50">
              <div className="text-sm font-semibold text-ink-900 mb-2">Prefer to try it yourself?</div>
              <p className="text-sm text-ink-600 mb-3">Run the free ROI calculator and see how much faster collections would free up.</p>
              <Link href="/tools/ar-roi" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                Calculate your A/R ROI <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
