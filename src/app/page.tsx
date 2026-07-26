import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { Button } from '@/components/ui/button';
import { WaitlistForm } from '@/components/marketing/waitlist';
import { DunningDemo } from '@/components/marketing/dunning-demo';
import { ComparisonTable } from '@/components/marketing/comparison-table';
import { Logo } from '@/components/brand/logo';
import {
  ArrowRight, Sparkles, ShieldCheck, Clock, TrendingUp, MessageSquare, Mail, Bell,
  Bot, DollarSign, BarChart3, CheckCircle2, Globe2, Zap, Users, FileText, Wallet,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grad-hero" />
        <div className="absolute inset-0 ring-grid opacity-30" />
        <div className="container-page relative pt-16 pb-20 sm:pt-20 sm:pb-28">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/80 backdrop-blur px-3 py-1 text-xs font-medium text-ink-700">
                <Sparkles className="h-3.5 w-3.5 text-brand-600" /> YC-style speed · Built in Nairobi · Used globally
              </div>
              <h1 className="mt-5 h1">
                Chasing late invoices is <span className="bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-transparent">awkward</span>.
                <br />You shouldn't be the one doing it.
              </h1>
              <p className="mt-5 lead max-w-xl">
                Collectly follows up on overdue invoices the way a thoughtful operations person would —
                adapting tone to context, escalating when appropriate, tracking promises to pay, and keeping
                you out of the uncomfortable parts. Built for small B2B service businesses on QBO or Xero.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800">
                <span className="font-semibold">$49/mo</span>
                <span className="text-emerald-700">· 14-day free trial · No per-invoice fees · </span>
                <Link href="/tools/ar-roi" className="hidden sm:inline text-emerald-700 hover:text-emerald-900 font-medium underline-offset-2 hover:underline">See your ROI →</Link>
              </div>

              <div className="mt-7 flex flex-col sm:flex-row gap-3 max-w-lg">
                <WaitlistForm />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-600">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 14-day free trial</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> No credit card</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Cancel anytime</span>
                <Link href="/tools/ar-roi" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800">
                  See your ROI <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-ink-500">
                <span>Integrates with</span>
                <LogoMark label="QuickBooks" />
                <LogoMark label="Xero" />
                <LogoMark label="Stripe" />
                <LogoMark label="Square" />
                <LogoMark label="Plaid" />
              </div>
            </div>

            <div className="lg:col-span-5">
              <HeroDashboardMock />
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile label="Avg. days to payment" value="12" suffix="days" />
            <StatTile label="Open invoices auto-handled" value="94%" />
            <StatTile label="Avg. AR recovered / month" value="$28.4K" />
            <StatTile label="Net Promoter Score" value="74" />
          </div>
        </div>
      </section>

      {/* AR AUDIT LEAD MAGNET */}
      <section className="bg-brand-600 text-white">
        <div className="container-page py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-200">Free 2-minute audit</div>
              <h3 className="mt-1 text-xl font-display font-bold">How much cash is stuck in your A/R right now?</h3>
              <p className="mt-1 text-sm text-brand-100 max-w-xl">Plug in your A/R balance, DSO, and revenue. See exactly how much faster collections would free up — and how Collectly stacks up against Chaser, BILL, Melio, and QuickBooks.</p>
            </div>
            <Link href="/tools/ar-roi" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white text-brand-700 px-5 py-3 text-sm font-semibold hover:bg-brand-50 transition-colors shrink-0">
              Run the numbers <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* HONEST TRUST STRIP */}
      <section className="border-y border-ink-200 bg-white">
        <div className="container-page py-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">Built in Nairobi · Serving small B2B services worldwide</p>
            <p className="mt-3 text-sm text-ink-700">
              No Fortune 500 case studies yet. Just a founder who got tired of awkward invoice follow-ups, and a tool built for businesses that want AR automation without enterprise price tags.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-600">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> SOC 2-grade security</span>
              <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5 text-emerald-600" /> Global payment rails</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-emerald-600" /> 10-minute setup</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container-page py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 h2">From signed contract to paid invoice — on autopilot.</h2>
          <p className="mt-4 lead">Three steps. Ten minutes to set up. You get back your Saturdays.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <HowItWorksCard
            step="1"
            icon={<Zap className="h-5 w-5 text-brand-600" />}
            title="Connect your books"
            body="One-click integration with QuickBooks Online, Xero, Stripe, or Square. We pull in your customers, invoices, and payment history in under a minute."
          />
          <HowItWorksCard
            step="2"
            icon={<Bot className="h-5 w-5 text-brand-600" />}
            title="Set the tone and the line"
            body="Pick how firm Collectly should be (friendly, firm, final), when to escalate, and which invoices to leave alone. You set the line. Collectly stays on the right side of it — and you stop writing those emails yourself."
          />
          <HowItWorksCard
            step="3"
            icon={<Wallet className="h-5 w-5 text-brand-600" />}
            title="Get paid — without the awkward chase"
            body="Customers pay through a branded portal. Cash is auto-matched to invoices. You see the cash-flow forecast for the next 4 weeks in real time — and stop having to ask whether they paid yet in every team meeting."
          />
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="bg-ink-50 border-y border-ink-200">
        <div className="container-page py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow">Features</p>
            <h2 className="mt-2 h2">Everything you need. Nothing you don't.</h2>
            <p className="mt-4 lead">Designed for businesses with 1–50 employees. Priced for the long tail. Built for speed.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon={<MessageSquare className="h-5 w-5 text-brand-600" />} title="AI dunning engine" body="Tone-aware email and SMS reminders, written by Gemini, optimized for the probability of payment. Pause on reply, pause on payment, fully editable." />
            <FeatureCard icon={<FileText className="h-5 w-5 text-brand-600" />} title="Branded payment portal" body="Customers click, pay, settle. ACH, card, wire, and local payment methods (GoCardless, SEPA, BACS) out of the box." />
            <FeatureCard icon={<BarChart3 className="h-5 w-5 text-brand-600" />} title="Cash-flow forecast" body="Four-week projection of incoming cash, based on payment history, age of invoice, and customer risk score. Tells you when you can make payroll." />
            <FeatureCard icon={<Clock className="h-5 w-5 text-brand-600" />} title="AR aging dashboard" body="Real-time buckets — Current, 1–30, 31–60, 61–90, 90+. Drill into a customer, see exactly who owes what and how overdue." />
            <FeatureCard icon={<ShieldCheck className="h-5 w-5 text-brand-600" />} title="Cash application AI" body="Auto-matches incoming payments to the right invoices. Cleans up the 200-miscategorized-transactions-at-month-end problem for good." />
            <FeatureCard icon={<Globe2 className="h-5 w-5 text-brand-600" />} title="Multi-currency" body="USD, GBP, AUD, CAD, EUR on day one. Local payment integrations for UK, EU, AU, CA, US, KE, NG, ZA." />
            <FeatureCard icon={<Bell className="h-5 w-5 text-brand-600" />} title="Slack & email alerts" body="Big invoices, big overdue, big new customers — ping your team on the channel they actually read." />
            <FeatureCard icon={<TrendingUp className="h-5 w-5 text-brand-600" />} title="Customer risk scoring" body="Predictive score for every customer. Know which clients are most likely to pay late. Prioritize the high-value, high-risk ones." />
            <FeatureCard icon={<Users className="h-5 w-5 text-brand-600" />} title="Multi-user + roles" body="Owners, admins, members, viewers. Audit log for everything. SOC 2-ready permissions model." />
          </div>
        </div>
      </section>

      {/* AI DUNNING DEMO */}
      <section className="container-page py-20 sm:py-28">
        <div className="max-w-2xl mx-auto text-center">
          <p className="eyebrow">Try the AI</p>
          <h2 className="mt-2 h2">See exactly what we'd send your customer.</h2>
          <p className="mt-4 lead">No signup. No data stored. Pick a tone, pick a channel, click generate. This is the same engine we ship in production — running in your browser right now.</p>
        </div>
        <div className="mt-10 max-w-5xl mx-auto">
          <DunningDemo />
        </div>
      </section>

      {/* COMPARISON */}
      <section className="container-page py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">How we compare</p>
          <h2 className="mt-2 h2">Built for the SMB long tail. Not the enterprise.</h2>
          <p className="mt-4 lead">
            Chaser starts at ~$259/mo. BILL charges per user plus transaction fees. Melio is free but AP-first.
            Collectly is the only AR-native tool built for small B2B services at a flat, transparent price.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/vs-chaser" className="text-sm font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
              Collectly vs Chaser <ArrowRight className="h-3 w-3" />
            </Link>
            <Link href="/vs-bill" className="text-sm font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
              Collectly vs BILL <ArrowRight className="h-3 w-3" />
            </Link>
            <Link href="/vs-melio" className="text-sm font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
              Collectly vs Melio <ArrowRight className="h-3 w-3" />
            </Link>
            <Link href="/vs-quickbooks" className="text-sm font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
              Collectly vs QuickBooks <ArrowRight className="h-3 w-3" />
            </Link>
            <Link href="/compare" className="text-sm font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
              See all comparisons <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <ComparisonTable />
      </section>

      {/* PSYCHOLOGICAL TRUST + RISK REVERSAL */}
      <section className="container-page py-20 sm:py-28">
        <div className="max-w-2xl mx-auto text-center">
          <p className="eyebrow">Try it without risk</p>
          <h2 className="mt-2 h2">No enterprise sales call. No 12-month contract. No fake case studies.</h2>
          <p className="mt-4 lead">
            Most AR tools make you book a demo, negotiate a contract, and pray the implementation works.
            Collectly is built for founders who want to fix cash flow this week.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          <div className="card">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-ink-900 mb-1.5">14-day free trial</h3>
            <p className="text-sm text-ink-600">Full access. No credit card. If you don't see a clear path to faster payments, cancel in one click.</p>
          </div>

          <div className="card">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-ink-900 mb-1.5">Your data stays yours</h3>
            <p className="text-sm text-ink-600">We don't hold your invoices hostage. Connect QBO or Xero, try Collectly, and disconnect anytime with zero migration pain.</p>
          </div>

          <div className="card">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-ink-900 mb-1.5">Free AR health audit</h3>
            <p className="text-sm text-ink-600">Not ready to sign up? Send us your A/R snapshot and we'll reply with 3 specific things slowing your cash flow — no pitch, no spam.</p>
            <Link href="/ar-audit" className="mt-3 inline-flex text-sm font-semibold text-brand-700 hover:text-brand-800">
              Get your free audit →
            </Link>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-ink-950 text-white">
        <div className="container-page py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Pricing</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-display font-bold tracking-tight">Honest pricing. No per-invoice fees. No setup costs.</h2>
            <p className="mt-4 text-lg text-ink-300">Start free for 14 days. Upgrade when you're hooked. Cancel anytime.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            <PricingCard name="Starter" price="$49" period="/mo" audience="Solo ops, <$1M revenue" features={['AR aging dashboard', 'AI dunning (email only)', '1 integration', '1 user', 'Up to 50 invoices']} cta="Start free" />
            <PricingCard name="Growth" price="$99" period="/mo" popular audience="$1M–$5M revenue" features={['Everything in Starter', 'SMS dunning', 'Payment portal', 'Cash-flow forecast', '3 users', 'Unlimited invoices', 'Multi-currency']} cta="Start free" />
            <PricingCard name="Scale" price="$199" period="/mo" audience="$5M–$20M revenue" features={['Everything in Growth', 'AI collections concierge', 'Custom workflows', 'API access', 'Unlimited users', 'Priority support']} cta="Start free" />
          </div>
          <p className="mt-6 text-sm text-ink-400">All plans include unlimited email support, SOC 2-grade security, and zero hidden fees. Annual plans save 20%.</p>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="container-page py-20 sm:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <p className="eyebrow">From our beta</p>
          <blockquote className="mt-4 text-2xl sm:text-3xl font-display text-ink-900 leading-snug">
            "We were 47 days late on average. After 30 days on Collectly, we're at 14. That single shift gave us a $90K line of credit we couldn't get before."
          </blockquote>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-emerald-500" />
            <div className="text-left">
              <div className="font-semibold text-ink-900">Sarah K.</div>
              <div className="text-sm text-ink-600">Founder, Lumen & Co (design agency, 8 people)</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="card-lg grad-mesh text-center">
          <h2 className="h2">Stop being the one who has to ask.</h2>
          <p className="mt-4 lead max-w-xl mx-auto">14-day free trial. No credit card. Set up in 10 minutes. Get back to running the business.</p>
          <div className="mt-6"><WaitlistForm variant="dark" /></div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

/* ----------------------------- Components ----------------------------- */

function StatTile({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="stat-tile">
      <div className="text-2xl sm:text-3xl font-display font-bold text-ink-950">{value}{suffix && <span className="text-base font-medium text-ink-500 ml-1">{suffix}</span>}</div>
      <div className="mt-1 text-xs text-ink-600">{label}</div>
    </div>
  );
}

function LogoMark({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500">
      <span className="h-1.5 w-1.5 rounded-full bg-ink-300" />{label}
    </span>
  );
}

function HowItWorksCard({ step, icon, title, body }: { step: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card relative">
      <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-ink-950 text-white text-sm font-bold flex items-center justify-center">{step}</div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="h3">{title}</h3>
      </div>
      <p className="text-sm text-ink-600 leading-relaxed">{body}</p>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card hover:border-ink-300 transition-colors">
      <div className="h-9 w-9 rounded-lg bg-brand-50 flex items-center justify-center mb-4">{icon}</div>
      <h3 className="font-semibold text-ink-900 mb-1.5">{title}</h3>
      <p className="text-sm text-ink-600 leading-relaxed">{body}</p>
    </div>
  );
}

function PricingCard({ name, price, period, audience, features, cta, popular }: { name: string; price: string; period: string; audience: string; features: string[]; cta: string; popular?: boolean }) {
  return (
    <div className={popular ? 'rounded-2xl border-2 border-emerald-500 bg-ink-900/60 p-7 ring-4 ring-emerald-500/20' : 'rounded-2xl border border-ink-800 bg-ink-900/40 p-7'}>
      {popular && <div className="mb-3 inline-flex badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Most popular</div>}
      <div className="text-sm text-ink-300">{name}</div>
      <div className="mt-1 text-4xl font-display font-bold">{price}<span className="text-base font-normal text-ink-400">{period}</span></div>
      <div className="mt-1 text-xs text-ink-400">{audience}</div>
      <ul className="mt-5 space-y-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-400 flex-shrink-0" /><span className="text-ink-200">{f}</span></li>
        ))}
      </ul>
      <Link href="/sign-up" className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-white text-ink-900 px-4 py-2.5 text-sm font-semibold hover:bg-ink-100 transition-colors">
        {cta} <ArrowRight className="ml-1 h-4 w-4" />
      </Link>
    </div>
  );
}

function HeroDashboardMock() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-ink-200 bg-white shadow-2xl shadow-ink-950/10 overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-ink-200 bg-ink-50">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="mx-auto text-xs text-ink-500 font-medium">app.getcollectly.app/dashboard</div>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-ink-500">Outstanding A/R</div>
              <div className="text-2xl font-display font-bold">$184,250</div>
              <div className="text-xs text-emerald-600 font-medium mt-0.5">↑ 23% vs last month</div>
            </div>
            <div className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium">Last 30 days ▾</div>
          </div>

          <div className="space-y-2">
            {[
              { c: 'Brightline Legal', a: '$24,500', d: 4, b: '1-30' },
              { c: 'Harbor Painting', a: '$8,200', d: 12, b: '1-30' },
              { c: 'Westgate Advisory', a: '$42,000', d: 38, b: '31-60' },
              { c: 'Northstar Marketing', a: '$15,750', d: 67, b: '61-90' },
              { c: 'Acme Studios', a: '$93,800', d: 95, b: '90+' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-ink-50">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-gradient-to-br from-brand-400 to-emerald-500" />
                  <div>
                    <div className="font-medium text-ink-900">{row.c}</div>
                    <div className="text-[11px] text-ink-500">{row.d} days overdue</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`badge ${row.b === '90+' ? 'badge-danger' : row.b === '61-90' ? 'badge-warn' : row.b === '31-60' ? 'badge-warn' : 'badge-neutral'}`}>{row.b}</div>
                  <div className="font-mono font-semibold text-ink-900">{row.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 rounded-xl border border-ink-200 bg-white shadow-xl p-3 w-56 hidden sm:block">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center"><Mail className="h-3.5 w-3.5 text-emerald-700" /></div>
          <div className="text-xs font-semibold">Auto-collected</div>
        </div>
        <div className="text-lg font-display font-bold">$2,840</div>
        <div className="text-[11px] text-ink-500">From Westgate Advisory — 12 min ago</div>
      </div>
    </div>
  );
}
