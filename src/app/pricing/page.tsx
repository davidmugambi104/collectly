import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Sparkles, X } from 'lucide-react';
import { PLAN_PRICING, FOUNDING, PRACTICE_INCLUDED_ORGS, PRACTICE_EXTRA_ORG_MONTHLY, PRACTICE_SCALE_INCLUDED_ORGS, PRACTICE_SCALE_CROSSOVER_ORGS } from '@/lib/utils';
import { billingCopy, PORTAL_PAYMENT_ANSWER } from '@/lib/billing-copy';
import { stripeBillingStatus } from '@/lib/stripe-billing-config';
import { pageMetadata, faqJsonLd, pricingProductJsonLd } from '@/lib/seo';
import { type FaqItem } from '@/components/marketing/faq-section';
import { Reveal } from '@/components/marketing/reveal';
import { TrackView } from '@/components/marketing/track-view';
import { TrackedLink } from '@/components/marketing/tracked-link';

// The questions this page actually shows, now also the ones it declares.
// The JSON-LD used to list five generic questions ("Can I cancel anytime?",
// "What does Mugavi charge per invoice?") while the visible section asked
// eight entirely different and considerably more honest ones — wire transfer
// only for now, manual invoicing for founding customers, card checkout not
// live. The visible set is the better content, so it is the source.
const billing = billingCopy(stripeBillingStatus(process.env).checkoutReady);
const FAQS: FaqItem[] = [
            { q: 'Do you support multi-entity or multiple companies?', a: `That is what the ${PLAN_PRICING.growth.name} plan is: up to ${PRACTICE_INCLUDED_ORGS} client organizations under one account with consolidated AR reporting, then $${PRACTICE_EXTRA_ORG_MONTHLY} per additional book. ${PLAN_PRICING.scale.name} is a flat $${PLAN_PRICING.scale.monthly}/mo for up to ${PRACTICE_SCALE_INCLUDED_ORGS} books.` },
            { q: 'What payment methods does the portal accept?', a: PORTAL_PAYMENT_ANSWER },
            { q: 'Is there really a free trial?', a: `Yes. 14 days, full access to ${PLAN_PRICING.growth.name}-tier features, no credit card required.` },
            { q: 'How does billing work?', a: billing.howBillingWorks },
            { q: 'Do text reminders cost extra?', a: 'Email reminders and AI drafts are included in every plan. Text messages cost money to send, so if you turn them on we pass on the message cost from our provider at cost, with no markup, and show the count on your invoice. Texts only go to customers who have opted in, and nothing sends until you approve it unless you have chosen automatic sending.' },
            { q: 'Is there a limit on invoices?', a: 'No published limit. Plans are priced per client book, not per invoice. We expect ordinary use for a business\'s own receivables; if your use is ever far beyond that, we will talk to you first and agree what to do before we limit or charge anything.' },
            { q: 'Do you take a cut of payments?', a: 'No. We don\'t apply a platform fee on top of what your payment processor already charges.' },
            { q: 'What if I outgrow my plan?', a: billing.outgrow },
            { q: 'Do you support multi-currency?', a: `Yes. USD, GBP, AUD, CAD and EUR.` },
            { q: 'Can I switch from another tool?', a: 'Mugavi reads invoices and customers from QuickBooks Online (beta) and Xero. If your books are somewhere else, ask first and we will tell you honestly whether it will work. We do not run migrations for you.' },
];

export const metadata = pageMetadata({
  title: `Pricing: A/R automation priced per client book, from $${PLAN_PRICING.starter.monthly}/mo`,
  description:
    `$${PLAN_PRICING.starter.monthly}/mo for one business, $${PLAN_PRICING.growth.monthly}/mo for a practice with up to ${PRACTICE_INCLUDED_ORGS} client ` +
    `organizations, then $${PRACTICE_EXTRA_ORG_MONTHLY} per extra book. No per-invoice or setup fees. Cancel anytime.`,
  path: '/pricing',
  image: '/og-pricing.png',
  keywords: [
    'Mugavi pricing',
    'Xero AR tool pricing',
    'Chaser alternative cost',
    'invoice automation flat rate',
    'small business AR software',
    'BILL alternative pricing',
  ],
});

// Combining FAQ + Product+Offer schema. Product drives the price-card
// rich result; FAQ drives the "questions people also ask" rich result.
// Both are emitted in one array so neither blocks the other.
const pricingJsonLd = JSON.stringify([
  pricingProductJsonLd(),
  faqJsonLd(FAQS),
]);

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <TrackView event="pricing_page_view" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: pricingJsonLd }} />
      <MarketingHeader />
      {/* Laid out the way Paidnice, Chaser and Upflow lay theirs out, on purpose:
          a centred headline, one plain line saying what the plans are based on
          and that there is no lock-in, then the plans in a row. A comparison
          against a named competitor used to sit above the plans and push them
          below the fold; the comparison pages already do that job, and a rival's
          price quoted here goes stale. */}
      <section className="container-page pt-16 pb-10 text-center">
        <h1 className="h1 mx-auto max-w-3xl text-balance">Simple pricing. No per-invoice fees.</h1>
        <p className="mt-5 lead mx-auto max-w-2xl">Priced per client book, not per invoice. 14-day trial with no credit card, founder-assisted setup, and no contracts. Cancel anytime.</p>
        <p className="mt-3 mx-auto max-w-2xl text-sm text-ink-600">Mugavi waits for you to approve each reminder, so nothing reaches your customer that you have not read. You can switch that off, but it is on until you do.</p>
        <p className="mt-3 text-sm text-brand-700 font-medium">Founding cohort: {FOUNDING.discountPct}% off for {FOUNDING.months} months, first {FOUNDING.seats} customers.</p>
      </section>

      <section className="container-page pb-20">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {(['starter','growth','scale'] as const).map((k, i) => {
            const p = PLAN_PRICING[k];
            if (!p) return null;
            return (
              // Staggered by 60ms so the two tiers arrive in reading order
              // rather than together. Reveal renders the final state outright
              // under prefers-reduced-motion.
              <Reveal key={k} delay={i * 0.06}>
              <div className={`card-lg relative h-full ${p.popular ? 'ring-2 ring-brand-500' : ''}`}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="badge-success"><Sparkles className="h-3 w-3 mr-1" />Built for practices</span></div>}
                <div className="text-sm text-ink-500">{p.name}</div>
                <div className="mt-1 text-5xl font-display font-bold text-ink-950">${p.monthly}<span className="text-base font-normal text-ink-500">/mo</span></div>
                {k !== 'scale' && <div className="mt-1 text-sm font-medium text-brand-700">${FOUNDING.monthly(k)}/mo for your first {FOUNDING.months} months as a founding customer</div>}
                <div className="mt-2 text-sm text-ink-600">{p.audience}</div>
                <div className="mt-1 text-sm text-ink-500">{p.orgs}</div>
                <ul className="mt-6 space-y-2.5 text-sm text-ink-700">
                  {/* The Scale tier is sold by conversation, so only the parts that
                      are plain fact are listed as ticks. */}
                  {(k === 'scale' ? p.features.filter((f) => f === 'Everything in Practice' || f === 'Priority support') : p.features).map((f) => (
                    <li key={f} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
                {k === 'scale' && <p className="mt-4 text-sm text-ink-600">Sold by conversation: we agree the setup with you before you sign.</p>}
                <TrackedLink
                  href={k === 'scale' ? '/contact' : '/sign-up'}
                  event="pricing_tier_click"
                  eventProps={{ tier: k, monthly: p.monthly }}
                  className={`mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${p.popular ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-ink-900 text-white hover:bg-ink-800'}`}
                >
                  {k === 'scale' ? 'Talk to sales' : 'Start free trial'} <ArrowRight className="h-4 w-4" />
                </TrackedLink>
              </div>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-10 max-w-2xl mx-auto text-center">
          <p className="text-sm text-ink-600">Comparing tools? See <Link href="/vs-paidnice" className="link">Mugavi vs Paidnice</Link>, <Link href="/vs-chaser" className="link">vs Chaser</Link>, <Link href="/vs-quickbooks" className="link">vs QuickBooks</Link>, or <Link href="/compare" className="link">all comparisons</Link>.</p>
          <p className="mt-3 text-sm text-ink-600">{PLAN_PRICING.growth.name} keeps going past {PRACTICE_INCLUDED_ORGS} books at ${PRACTICE_EXTRA_ORG_MONTHLY} each, and stays the cheaper option until {PRACTICE_SCALE_CROSSOVER_ORGS}. Past that, {PLAN_PRICING.scale.name} is ${PLAN_PRICING.scale.monthly}/mo flat for up to {PRACTICE_SCALE_INCLUDED_ORGS} books. <Link href="/contact" className="link">Talk to sales</Link>.</p>
          <p className="mt-3 text-sm text-ink-600">A bookkeeper or accountant running several client books? See <Link href="/for/bookkeepers" className="link">how Mugavi works for a practice</Link>.</p>
        </div>
      </section>

      <section className="bg-white border-y border-ink-200">
        <div className="container-page py-16 max-w-4xl">
          <h2 className="h2 text-center">What you will never pay for</h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-ink-700">
            {['Per-invoice fees', 'Per-email fees or any markup on text messages', 'Implementation consulting', 'Required onboarding calls', 'Annual contracts', "Hidden fees (you pay your payment provider's own ~0.4% processing cost, passed through at cost; and if you turn on text reminders, the carrier cost of each message, also at cost)", 'Cancellation fees', '"Premium" support tiers'].map((item) => (
              // Was danger-red on a list whose entire point is good news (fees
              // you will NEVER pay). Red signals "wrong" or "error" everywhere
              // else on the site; here nothing is wrong, so the mark is
              // absence, not alarm.
              <div key={item} className="flex items-center gap-2 py-1.5"><X className="h-3.5 w-3.5 text-ink-400" />{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="h2 text-center">Leaving is easy</h2>
          <p className="mt-3 text-center text-sm text-ink-600">What you can do today, and where the limits are.</p>
          <ul className="mt-8 space-y-3 text-sm text-ink-700">
            {[
              'Trial: 14 days, no card taken, and it does not turn into a paid plan on its own.',
              'Cancel or change plan: ask from Billing inside the app. David confirms by email, and nothing changes until he does. There is no cancellation fee and no contract. Billing is manual for now, so this is a request, not an instant button.',
              'Disconnect QuickBooks, Xero or Square: one click on Integrations. We ask the provider to revoke our access and delete the stored tokens. If the provider cannot be reached, our copy of the connection is still removed and you can revoke Mugavi from inside QuickBooks or Xero yourself. Customers and invoices already imported stay in Mugavi until you remove them or delete your account.',
              'Remove imported data: after you disconnect QuickBooks or Xero, Integrations shows what that sync left behind. You see the counts first, then confirm. Only rows that came from that provider are removed; anything you typed in stays. The owner or an admin can do it.',
              'Export: Settings has one download (a ZIP of CSV files) with your customers, invoices, reminders and what each customer owes, plus the statements you have emailed. Each of those is also a single CSV. The aged receivables report and a customer statement download as CSV too. The owner or an admin can export.',
              'Delete your account: the owner can do it from Settings. Customers, invoices, payments, reminder history and integrations are removed straight away, and backups roll off within 30 days.',
            ].map((item) => (
              <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="h2 text-center">What Mugavi does not do yet</h2>
          <p className="mt-3 text-center text-sm text-ink-600">Other tools do some of these. We would rather you read it here than find out after you sign up.</p>
          <ul className="mt-8 space-y-3 text-sm text-ink-700">
            {[
              'Early-payment discounts.',
              'Payment plans. We record a promise to pay and pause reminders until that day, but we do not run instalments.',
              'Scheduled or monthly statements. You can send a customer a statement by hand, with an Undo, but nothing is sent on a schedule.',
              'Late fees that run on their own. You set a rule and review each fee before it is applied. A fee is not written back to your accounting software or added to the payment page.',
              'Sending from your own personal mailbox. Reminders go out from Mugavi, or from your own domain once you verify it. Replies come to the Mugavi Inbox.',
              'Posted letters, or placing the call for you. A call step puts a task on your list.',
              'Tags on customers or invoices, and a library of ready-made reminder wording.',
              'A read-only team role. Anyone you add to your workspace has the same access as you.',
              'An API or webhooks.',
            ].map((item) => (
              <li key={item} className="flex gap-2"><X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-20">
        <h2 className="h2 text-center">Frequently asked</h2>
        <div className="mt-10 max-w-2xl mx-auto space-y-4">
          {FAQS.map((f) => (
            <details key={f.q} className="card group">
              <summary className="cursor-pointer font-semibold text-ink-900 list-none flex items-center justify-between">{f.q}<span className="text-ink-400 group-open:rotate-45 transition-transform">+</span></summary>
              <p className="mt-2 text-sm text-ink-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="card-lg grad-mesh text-center">
          <h2 className="h2">Ready to stop chasing invoices?</h2>
          <p className="mt-4 lead">14-day trial. No credit card. Founder-assisted setup.</p>
          <p className="mt-2 text-sm text-ink-600">{FOUNDING.discountPct}% off for {FOUNDING.months} months while the first {FOUNDING.seats} founding places are open.</p>
          <div className="mt-6 max-w-md mx-auto">
            <Link href="/sign-up" className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-ink-950 px-5 py-3 text-sm font-semibold text-white hover:bg-ink-800 transition-colors">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
