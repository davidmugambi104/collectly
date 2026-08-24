import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import { pageMetadata, faqJsonLd, webPageJsonLd, softwareAppJsonLd } from '@/lib/seo';
import { CheckCircle2, Sparkles, ArrowRight, ShieldCheck, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export const metadata = pageMetadata({
  title: 'A/R automation for agencies on Xero — stop chasing late invoices',
  description:
    'AR automation built for 5-30 person agencies and consultancies on Xero. ' +
    'Tone-aware AI reminders, reply-or-pay pause, promise-to-pay tracking, and ' +
    'dispute classification — from $49/mo flat.',
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
      'How Collectly handles accounts receivable for 5-30 person agencies: ' +
      'tone-aware AI reminders, Xero integration, reply-or-pay pause, and ' +
      'promise-to-pay tracking.',
    path: '/for/agencies',
  }),
  softwareAppJsonLd(),
  faqJsonLd([
    {
      q: 'How much time does an agency typically spend chasing invoices?',
      a: 'For a 5-30 person agency on a 30-day payment cycle, the founder or ' +
         'operations lead typically spends 3 to 5 hours per week chasing late ' +
         'invoices. Collectly reduces that to under 30 minutes per week after ' +
         'the first 14 days of consistent approve-and-send operation.',
    },
    {
      q: 'How does Collectly handle project milestone invoices?',
      a: 'Each invoice, regardless of whether it is a recurring retainer or a ' +
         'project milestone, is monitored individually. The dunning sequence is ' +
         'per-invoice, not per-customer. Project milestone invoices typically ' +
         'see a firmer first-touch tone by default because the relationship is ' +
         'time-bounded and a single missed payment can break the deal flow.',
    },
    {
      q: 'Will Collectly send reminders to clients we want to keep close?',
      a: 'Yes, unless you exclude them. The Collectly dashboard has a single-click ' +
         'exclude button per customer. You can mark a customer as strategic and ' +
         'Collectly stops all automated reminders on that customer; only the ' +
         'human-in-the-loop approval prompt remains.',
    },
    {
      q: 'Does this work for agencies on net-30 or net-60 terms?',
      a: 'Both. The dunning cadence is configurable per organization. Net-60 ' +
         'customers typically get a friendlier initial tone and a longer gap ' +
         'before the firm stage. Collectly adapts by reading the original payment ' +
         'terms on the Xero invoice.',
    },
    {
      q: 'How does Collectly handle retainer continuity disputes?',
      a: 'When a customer replies "we cancelled the retainer last month," ' +
         'Collectly classifies the reply as a blocker (not a promise-to-pay), ' +
         'pauses reminders on that invoice, and surfaces it in your disputes ' +
         'worklist so the team can resolve the dispute (often: confirm the ' +
         'cancellation date, update Xero, and write off or refund as needed).',
    },
  ]),
]);

export default function ForAgenciesPage() {
  return (
    <div className="min-h-screen">
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
          Founder-assisted setup, no per-invoice fees, $49/mo flat for the first 20
          founding customers.
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
              Collectly pauses the sequence and surfaces the conversation for human
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
              per-customer and per-customer-stage — you set them once, Collectly
              follows them.
            </p>
          </div>
          <div className="card">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold text-ink-900">Sends you dangerous invoices for review.</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">
              Some invoices should never go on autopilot. Strategic accounts,
              disputed accounts, accounts over a year old, accounts above a value
              threshold — Collectly surfaces them for human review every time.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-ink-50 border-y border-ink-200">
        <div className="container-page py-16 max-w-3xl">
          <p className="eyebrow">Why agencies pick Collectly over Chaser and BILL</p>
          <h2 className="mt-3 h2">Built for the SMB agency long tail.</h2>
          <p className="mt-4 lead">
            Chaser is templated reminders starting around $259/mo. BILL bundles
            AP, AR, and spend at $49 per user/month plus transaction fees. Neither
            is wrong — they&apos;re just priced and positioned for different teams.
            Collectly is the AR-native flat-rate option for 5-30 person agencies
            that want to stop writing those emails themselves.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink-700">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> One Xero organization, up to 150 monitored invoices, $49/mo flat.</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Approval mode is the default. Autopilot unlocks only after 25 reviewed messages.</li>
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
      <MarketingFooter />
    </div>
  );
}
