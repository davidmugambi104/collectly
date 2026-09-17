import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Sparkles, X } from 'lucide-react';
import { PLAN_PRICING, FOUNDING, PRACTICE_INCLUDED_ORGS, PRACTICE_EXTRA_ORG_MONTHLY, PRACTICE_SCALE_INCLUDED_ORGS, PRACTICE_SCALE_CROSSOVER_ORGS } from '@/lib/utils';
import { pageMetadata, faqJsonLd, pricingProductJsonLd } from '@/lib/seo';
import { type FaqItem } from '@/components/marketing/faq-section';

// The questions this page actually shows, now also the ones it declares.
// The JSON-LD used to list five generic questions ("Can I cancel anytime?",
// "What does Collectly charge per invoice?") while the visible section asked
// eight entirely different and considerably more honest ones — wire transfer
// only for now, manual invoicing for founding customers, card checkout not
// live. The visible set is the better content, so it is the source.
const FAQS: FaqItem[] = [
            { q: 'Do you support multi-entity or multiple companies?', a: `That is what the ${PLAN_PRICING.growth.name} plan is: up to ${PRACTICE_INCLUDED_ORGS} client organizations under one account with consolidated AR reporting, then $${PRACTICE_EXTRA_ORG_MONTHLY} per additional book. ${PLAN_PRICING.scale.name} adds per-entity workflows and role isolation.` },
            { q: 'What payment methods does the portal accept?', a: 'Wire transfer today, for every customer. Card, ACH, and mobile-money rails are built but temporarily disabled while we finish routing payments to your own account instead of ours — no timeline promises until that\'s done.' },
            { q: 'Is there really a free trial?', a: `Yes. 14 days, full access to ${PLAN_PRICING.growth.name}-tier features, no credit card required.` },
            { q: 'How does billing work?', a: `Founding customers get a manual invoice after the 14-day trial (bank transfer, Wise, or PayPal) at $${FOUNDING.monthly('growth')}/mo for ${PLAN_PRICING.growth.name}. Self-serve card checkout isn't live yet — no committed date.` },
            { q: 'Do you take a cut of payments?', a: 'No. We don\'t apply a platform fee on top of what your payment processor already charges.' },
            { q: 'What if I outgrow my plan?', a: 'Request an upgrade from Billing — David reviews and sends an invoice within 12 hours. Not yet automatic or self-serve.' },
            { q: 'Do you support multi-currency?', a: `Yes. USD, GBP, AUD, CAD, EUR in ${PLAN_PRICING.growth.name}. KES, NGN, ZAR in ${PLAN_PRICING.scale.name} or custom.` },
            { q: 'Can I switch from another tool?', a: 'Yes. Free migration from QuickBooks, Xero, FreshBooks, Wave, and most others.' },
];

export const metadata = pageMetadata({
  title: `Pricing — A/R automation priced per client book, from $${PLAN_PRICING.starter.monthly}/mo`,
  description:
    `Honest pricing for Collectly. $${PLAN_PRICING.starter.monthly}/mo for a single business, $${PLAN_PRICING.growth.monthly}/mo for ` +
    'a practice covering up to 10 client organizations ($40 a book). Founding ' +
    'cohort takes 40% off for 12 months. No per-invoice fees, no setup fees, ' +
    'no hidden costs. Cancel anytime.',
  path: '/pricing',
  image: '/og-pricing.png',
  keywords: [
    'Collectly pricing',
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
      {/* Left-aligned, not centred. A centred eyebrow over a centred two-line
          headline over a centred three-line subhead is the most dated thing on
          the site: it gives the eye no edge to return to, so each line has to
          be re-found. The hard <br/> is gone with it — the headline now breaks
          on its own measure at whatever width the viewport is. */}
      <section className="container-page pt-16 pb-12">
        <p className="eyebrow">Pricing</p>
        <h1 className="mt-3 h1 max-w-3xl text-balance">Honest pricing. Built for the long tail.</h1>
        <p className="mt-5 lead max-w-xl">Priced per client book, not per invoice. 14-day trial, founder-assisted setup. Cancel anytime — no per-invoice fees, no setup costs.</p>
        <p className="mt-3 text-sm text-brand-700 font-medium">Founding cohort: {FOUNDING.discountPct}% off for {FOUNDING.months} months, first {FOUNDING.seats} customers.</p>

        <div className="mt-8 grid sm:grid-cols-2 gap-4 max-w-3xl">
          {[
            { label: 'Collectly Practice', price: `$${Math.round(PLAN_PRICING.growth.monthly / PRACTICE_INCLUDED_ORGS)}/mo per client book`, note: `$${PLAN_PRICING.growth.monthly}/mo covering ${PRACTICE_INCLUDED_ORGS} organizations`, highlight: true },
            { label: 'Chaser', price: '~$259/mo', note: 'entry tier, one organization · source: chaser.com' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border px-4 py-3 text-left ${c.highlight ? 'border-emerald-300 bg-emerald-50/40' : 'border-ink-200 bg-white'}`}>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">{c.label}</div>
              <div className={`mt-1 text-lg font-display font-bold ${c.highlight ? 'text-emerald-800' : 'text-ink-900'}`}>{c.price}</div>
              <div className="text-xs text-ink-600">{c.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
          {(['starter','growth'] as const).map((k) => {
            const p = PLAN_PRICING[k];
            if (!p) return null;
            return (
              <div key={k} className={`card-lg relative ${p.popular ? 'ring-2 ring-brand-500' : ''}`}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="badge-success"><Sparkles className="h-3 w-3 mr-1" />Most popular</span></div>}
                <div className="text-sm text-ink-500">{p.name}</div>
                <div className="mt-1 text-5xl font-display font-bold text-ink-950">${p.monthly}<span className="text-base font-normal text-ink-500">/mo</span></div>
                <div className="mt-1 text-sm font-medium text-brand-700">${FOUNDING.monthly(k)}/mo for your first {FOUNDING.months} months as a founding customer</div>
                <div className="mt-2 text-sm text-ink-600">{p.audience}</div>
                <div className="mt-1 text-sm text-ink-500">{p.orgs}</div>
                <ul className="mt-6 space-y-2.5 text-sm text-ink-700">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
                <Link href="/sign-up" className={`mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${p.popular ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-ink-900 text-white hover:bg-ink-800'}`}>
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-10 max-w-2xl mx-auto text-center">
          <p className="text-sm text-ink-600">{PLAN_PRICING.growth.name} keeps going past {PRACTICE_INCLUDED_ORGS} books at ${PRACTICE_EXTRA_ORG_MONTHLY} each, and stays the cheaper option until {PRACTICE_SCALE_CROSSOVER_ORGS}. Past that, {PLAN_PRICING.scale.name} is ${PLAN_PRICING.scale.monthly}/mo flat for up to {PRACTICE_SCALE_INCLUDED_ORGS} books, and adds API access and SSO. <Link href="/contact" className="link">Talk to sales</Link>.</p>
        </div>
      </section>

      <section className="bg-white border-y border-ink-200">
        <div className="container-page py-16 max-w-4xl">
          <h2 className="h2 text-center">What you will never pay for</h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-ink-700">
            {['Per-invoice fees', 'Per-email or per-SMS fees', 'Implementation consulting', 'Required onboarding calls', 'Annual contracts', "Hidden fees (you pay your payment provider's own ~0.4% processing cost, passed through at cost)", 'Cancellation fees', '"Premium" support tiers'].map((item) => (
              <div key={item} className="flex items-center gap-2 py-1.5"><X className="h-3.5 w-3.5 text-red-500" />{item}</div>
            ))}
          </div>
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
