import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { WaitlistForm } from '@/components/marketing/waitlist';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Sparkles, X } from 'lucide-react';
import { PLAN_PRICING } from '@/lib/utils';

export const metadata = { title: 'Pricing' };

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 text-center">
        <p className="eyebrow">Pricing</p>
        <h1 className="mt-3 h1">Honest pricing.<br/>Built for the long tail.</h1>
        <p className="mt-5 lead max-w-2xl mx-auto">Start free for 14 days. Cancel anytime. No per-invoice fees, no setup costs, no hidden anything.</p>
        <p className="mt-3 text-sm text-brand-700 font-medium">Founding customer pricing: $49/mo for the first 20 signups, then $99/mo.</p>

        <div className="mt-8 grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {[
            { label: 'Collectly', price: '$49/mo flat', note: 'founding customer price · first 20 only', highlight: true },
            { label: 'Chaser', price: '~$259/mo', note: 'starts 5× higher · source: chaser.com' },
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
        <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {(['starter','growth'] as const).map((k) => {
            const p = PLAN_PRICING[k];
            if (!p) return null;
            return (
              <div key={k} className={`card-lg relative ${p.popular ? 'ring-2 ring-brand-500' : ''}`}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="badge-success"><Sparkles className="h-3 w-3 mr-1" />Most popular</span></div>}
                <div className="text-sm text-ink-500">{p.name}</div>
                <div className="mt-1 text-5xl font-display font-bold text-ink-950">${p.monthly}<span className="text-base font-normal text-ink-500">/mo</span></div>
                <div className="mt-1 text-sm text-ink-600">
                  {k === 'starter' && 'First 20 agencies and consultancies · all features unlocked · founder onboarding'}
                  {k === 'growth' && 'For agencies and consultancies scaling past the founding cohort'}
                </div>
                <ul className="mt-6 space-y-2.5 text-sm text-ink-700">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
                <Link href="/sign-up" className={`mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${p.popular ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-ink-900 text-white hover:bg-ink-800'}`}>
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-10 max-w-2xl mx-auto text-center">
          <p className="text-sm text-ink-600">Need 20+ seats, custom integrations, or a private cloud deployment? <Link href="/contact" className="link">Talk to sales</Link> for our Scale plan.</p>
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
          {[
            { q: 'Do you support multi-entity or multiple companies?', a: 'Growth supports multiple entities under one account with consolidated reporting. Scale adds per-entity workflows and role isolation.' },
            { q: 'What payment methods does the portal accept?', a: "It depends on the payment provider you connect. Paystack is live today for NG/GH/KE/ZA (card, bank transfer, mobile money). Stripe and Square are wired but still in test/sandbox for US/UK/AU/CA until production credentials are swapped. We never mark up processor fees." },
            { q: 'Is there really a free trial?', a: 'Yes. 14 days, full access to Growth-tier features, no credit card required.' },
            { q: 'How does billing work?', a: 'Founding customers get a manual Stripe invoice for $49/mo after the 14-day trial. Automated checkout will replace this once US/UK payment credentials are live. Annual plans save 20%.' },
            { q: 'Do you take a cut of payments?', a: 'No. We pass through processor fees at cost. We make money on the subscription, not your transaction volume.' },
            { q: 'What if I outgrow my plan?', a: 'Upgrade in one click. We prorate the difference automatically.' },
            { q: 'Do you support multi-currency?', a: 'Yes. USD, GBP, AUD, CAD, EUR in Growth. KES, NGN, ZAR in Scale or custom.' },
            { q: 'Can I switch from another tool?', a: 'Yes. Free migration from QuickBooks, Xero, FreshBooks, Wave, and most others.' },
          ].map((f) => (
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
          <p className="mt-4 lead">14-day free trial. No credit card.</p>
          <div className="mt-6 max-w-md mx-auto">
            <Link href="/sign-up" className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-ink-950 px-5 py-3 text-sm font-semibold text-white hover:bg-ink-800 transition-colors">
              Start free 14-day trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
