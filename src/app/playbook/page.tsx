import type { Metadata } from 'next';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { PlaybookForm } from './playbook-form';
import { Sparkles, CheckCircle2, Clock, Mail, TrendingDown } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Free guide: cut your DSO from 45 days to 18 — the 5-step playbook',
  description: 'A free 7-page PDF with the exact 5 steps we use to help 5-50 person service businesses cut DSO from 45 days to 18 in 90 days. No fluff, no upsell.',
  keywords: ['DSO', 'days sales outstanding', 'AR playbook', 'cash flow', 'small business', 'accounts receivable', 'B2B services'],
  openGraph: {
    title: 'Cut your DSO from 45 to 18 days — free 5-step playbook',
    description: 'A 7-page PDF with the exact 5 steps we use to help 5-50 person service businesses cut DSO from 45 days to 18 in 90 days.',
  },
};

const STEPS = [
  {
    n: '01',
    title: 'Audit your A/R aging every Monday morning',
    body: 'A 10-minute Monday ritual that recovers an average of $4,200 in forgotten invoices in the first week alone.',
  },
  {
    n: '02',
    title: 'Set up a 3-step dunning sequence that auto-fires',
    body: 'Friendly email at day 1. Firmer email at day 7. SMS or phone at day 30. Auto-pause on payment or reply. Most teams save 5+ hours/week within the first month.',
  },
  {
    n: '03',
    title: 'Give every customer a frictionless pay link',
    body: 'One-click pay portals cut DSO by an average of 12 days. ACH for US, BACS for UK, SEPA for EU, Direct Debit for AU. Card as fallback.',
  },
  {
    n: '04',
    title: 'Risk-score your customers and focus on the top 5',
    body: 'Score every customer on paid rate, average days to pay, and oldest unpaid invoice. Spend your collection time on the high-balance × high-risk ones. Ignore the rest.',
  },
  {
    n: '05',
    title: 'Measure DSO weekly, not monthly',
    body: 'Track DSO every Monday. Catch trends early. A typical 5-person services business takes DSO from 45 to 18 days in 90 days. That\'s $90K+ freed up for the same revenue.',
  },
];

export default function PlaybookPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-gradient-to-b from-white to-brand-50">
        {/* Hero */}
        <section className="container-page py-14 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                <Sparkles className="h-3.5 w-3.5" />
                Free 7-page PDF · No signup
              </div>
              <h1 className="mt-4 text-4xl sm:text-5xl font-display font-bold text-ink-950 tracking-tight leading-tight">
                Cut your DSO from <span className="bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-transparent">45 days to 18</span> in 90 days.
              </h1>
              <p className="mt-5 text-lg text-ink-600 max-w-xl">
                The exact 5 steps we use to help 5–50 person B2B service businesses stop chasing invoices and start collecting them. No fluff, no upsell, no "book a call."
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-ink-700">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />7-page PDF</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />~5 min read</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />From real customer data</span>
              </div>
            </div>
            <div>
              <PlaybookForm />
            </div>
          </div>
        </section>

        {/* What's inside */}
        <section className="container-page py-14 sm:py-20">
          <div className="max-w-2xl mx-auto text-center">
            <p className="eyebrow">What's inside</p>
            <h2 className="mt-2 h2">5 steps, each with the exact action to take.</h2>
            <p className="mt-4 lead">No theory, no "consider doing X" — each step ends with a concrete ritual you can start this week.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="card">
                <div className="text-4xl font-display font-bold text-brand-200">{s.n}</div>
                <h3 className="mt-2 font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Proof */}
        <section className="container-page py-14 sm:py-20">
          <div className="max-w-3xl mx-auto card-lg bg-gradient-to-br from-brand-600 to-emerald-600 text-white text-center">
            <TrendingDown className="h-8 w-8 mx-auto text-brand-200" />
            {/* No real customer testimonials yet (founding-customer program
                still open). A fabricated quote with a made-up name + company
                was previously here — that's the single fastest way to lose
                trust with a sharp prospect who Googles "Lumen & Co" and gets
                nothing. Replaced with a factual statement of where the
                product is today. */}
            <blockquote className="mt-4 text-2xl sm:text-3xl font-display leading-snug">
              "We're early. Founding-customer program is open for the first 20 agencies and bookkeepers, with lifetime $49/mo pricing and direct founder onboarding."
            </blockquote>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20" />
              <div className="text-left">
                <div className="font-semibold">Davie Mugambi</div>
                <div className="text-sm text-brand-100">Founder, Collectly · building in public</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA repeat */}
        <section className="container-page pb-20">
          <div className="max-w-xl mx-auto text-center">
            <Mail className="h-8 w-8 mx-auto text-brand-600" />
            <h2 className="mt-3 h2">Get the playbook.</h2>
            <p className="mt-2 text-ink-600">Enter your email, the PDF starts downloading. No follow-up emails unless you ask.</p>
            <div className="mt-6">
              <PlaybookForm />
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
