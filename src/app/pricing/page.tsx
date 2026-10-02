import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Sparkles, X } from 'lucide-react';
import { PLAN_PRICING, FOUNDING, PRACTICE_INCLUDED_ORGS, PRACTICE_EXTRA_ORG_MONTHLY, PRACTICE_SCALE_INCLUDED_ORGS, PRACTICE_SCALE_CROSSOVER_ORGS } from '@/lib/utils';
import { pageMetadata, faqJsonLd, pricingProductJsonLd } from '@/lib/seo';
import { type FaqItem } from '@/components/marketing/faq-section';
import { Reveal } from '@/components/marketing/reveal';
import { TrackedLink } from '@/components/marketing/tracked-link';

// The questions this page actually shows, now also the ones it declares.
// The JSON-LD used to list five generic questions ("Can I cancel anytime?",
// "What does Mugavi charge per invoice?") while the visible section asked
// eight entirely different and considerably more honest ones — wire transfer
// only for now, manual invoicing for founding customers, card checkout not
// live. The visible set is the better content, so it is the source.
const FAQS: FaqItem[] = [
            { q: 'Do you support multi-entity or multiple companies?', a: `That is what the ${PLAN_PRICING.growth.name} plan is: up to ${PRACTICE_INCLUDED_ORGS} client organizations under one account with consolidated AR reporting, then $${PRACTICE_EXTRA_ORG_MONTHLY} per additional book. ${PLAN_PRICING.scale.name} adds per-entity workflows and role isolation.` },
            { q: 'What payment methods does the portal accept?', a: 'Wire transfer today, for every customer. Card, ACH, and mobile-money rails are built but temporarily disabled while we finish routing payments to your own account instead of ours. No timeline promises until that\'s done.' },
            { q: 'Is there really a free trial?', a: `Yes. 14 days, full access to ${PLAN_PRICING.growth.name}-tier features, no credit card required.` },
            { q: 'How does billing work?', a: `Founding customers get a manual invoice after the 14-day trial (bank transfer, Wise, or PayPal) at $${FOUNDING.monthly('growth')}/mo for ${PLAN_PRICING.growth.name}. Self-serve card checkout isn't live yet. No committed date.` },
            { q: 'Do you take a cut of payments?', a: 'No. We don\'t apply a platform fee on top of what your payment processor already charges.' },
            { q: 'What if I outgrow my plan?', a: 'Request an upgrade from Billing: David reviews and sends an invoice within 12 hours. Not yet automatic or self-serve.' },
            { q: 'Do you support multi-currency?', a: `Yes. USD, GBP, AUD, CAD, EUR in ${PLAN_PRICING.growth.name}. KES, NGN, ZAR in ${PLAN_PRICING.scale.name} or custom.` },
            { q: 'Can I switch from another tool?', a: 'Yes. Free migration from QuickBooks, Xero, FreshBooks, Wave, and most others.' },
];

export const metadata = pageMetadata({
  title: `Pricing: A/R automation priced per client book, from $${PLAN_PRICING.starter.monthly}/mo`,
  description:
    `$${PLAN_PRICING.starter.monthly}/mo for one business, $${PLAN_PRICING.growth.monthly}/mo for a practice with up to 10 client ` +
    'organizations. No per-invoice or setup fees. Cancel anytime.',
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
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="badge-success"><Sparkles className="h-3 w-3 mr-1" />Most popular</span></div>}
                <div className="text-sm text-ink-500">{p.name}</div>
                <div className="mt-1 text-5xl font-display font-bold text-ink-950">${p.monthly}<span className="text-base font-normal text-ink-500">/mo</span></div>
                {k !== 'scale' && <div className="mt-1 text-sm font-medium text-brand-700">${FOUNDING.monthly(k)}/mo for your first {FOUNDING.months} months as a founding customer</div>}
                <div className="mt-2 text-sm text-ink-600">{p.audience}</div>
                <div className="mt-1 text-sm text-ink-500">{p.orgs}</div>
                <ul className="mt-6 space-y-2.5 text-sm text-ink-700">
                  {/* The Scale tier is sold by conversation, so only the parts that
                      are plain fact are listed as ticks. API access, SSO and custom
                      workflows are scoped with the founder before anyone signs. */}
                  {(k === 'scale' ? p.features.filter((f) => f === 'Everything in Practice' || f === 'Priority support') : p.features).map((f) => (
                    <li key={f} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
                {k === 'scale' && <p className="mt-4 text-sm text-ink-600">API access, SSO and custom workflows are scoped with you before you sign.</p>}
                <TrackedLink
                  href={k === 'scale' ? '/contact' : '/sign-up'}
                  event="pricing_tier_click"
                  eventProps={{ tier: k, plan_name: p.name, monthly: p.monthly }}
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
          <p className="mt-3 text-sm text-ink-600">{PLAN_PRICING.growth.name} keeps going past {PRACTICE_INCLUDED_ORGS} books at ${PRACTICE_EXTRA_ORG_MONTHLY} each, and stays the cheaper option until {PRACTICE_SCALE_CROSSOVER_ORGS}. Past that, {PLAN_PRICING.scale.name} is ${PLAN_PRICING.scale.monthly}/mo flat for up to {PRACTICE_SCALE_INCLUDED_ORGS} books, and adds API access and SSO. <Link href="/contact" className="link">Talk to sales</Link>.</p>
          <p className="mt-3 text-sm text-ink-600">A bookkeeper or accountant running several client books? See <Link href="/for/bookkeepers" className="link">how Mugavi works for a practice</Link>.</p>
        </div>
      </section>

      <section className="bg-white border-y border-ink-200">
        <div className="container-page py-16 max-w-4xl">
          <h2 className="h2 text-center">What you will never pay for</h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-ink-700">
            {['Per-invoice fees', 'Per-email or per-SMS fees', 'Implementation consulting', 'Required onboarding calls', 'Annual contracts', "Hidden fees (you pay your payment provider's own ~0.4% processing cost, passed through at cost)", 'Cancellation fees', '"Premium" support tiers'].map((item) => (
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
