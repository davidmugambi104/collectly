import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';

import { DunningDemo } from '@/components/marketing/dunning-demo';
import { ComparisonTable } from '@/components/marketing/comparison-table';
import { Logo } from '@/components/brand/logo';
import {
  ArrowRight, Sparkles, ShieldCheck, Clock, TrendingUp, MessageSquare, Mail, Bell,
  Bot, DollarSign, BarChart3, CheckCircle2, Globe2, Zap, Users, FileText, Wallet, Calculator,
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
                <Sparkles className="h-3.5 w-3.5 text-brand-600" /> YC-style speed · Built in Nairobi · Used in 🇺🇸 🇬🇧 🇪🇺 🇦🇺 🇨🇦 🇰🇪 🇳🇬
              </div>
              <h1 className="mt-5 h1">
                Stop chasing late invoices.
                <br />
                <span className="text-2xl sm:text-3xl font-normal text-ink-700">AI follow-ups for marketing agencies, consultancies, IT firms, and bookkeepers on QuickBooks or Xero.</span>
              </h1>
              <p className="mt-5 lead max-w-xl">
                Collectly connects to QuickBooks or Xero, identifies overdue invoices, and sends tone-aware
                email and SMS follow-ups. It pauses when customers reply or pay. You review and approve,
                or let it run on autopilot. Built for local-service agencies (5–50 people) and the
                fractional bookkeepers who serve them.
              </p>

              <div className="mt-6 inline-flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 backdrop-blur px-4 py-3 text-sm text-emerald-900 shadow-sm">
                <span className="font-bold">$49/mo · 14-day free trial · No per-invoice fees</span>
                <span className="hidden sm:inline text-emerald-300">|</span>
                <span className="text-emerald-700">Chaser starts at ~$259/mo · BILL charges per user + transaction fees</span>
              </div>
              <p className="mt-2 text-xs text-ink-500">First 20 customers lock in $49/mo forever. Cancel anytime.</p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3 max-w-lg">
                <Link href="/sign-up" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink-950 px-5 py-3 text-sm font-semibold text-white hover:bg-ink-800 transition-colors">
                  Start free 14-day trial <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/tour" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-ink-200 bg-white px-5 py-3 text-sm font-semibold text-ink-900 hover:bg-ink-50 transition-colors">
                  See the dashboard demo
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-600">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 10-minute setup</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> No credit card required</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Cancel anytime</span>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-ink-600">
                <span className="font-medium">Accepts</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2 py-1 bg-white">🇺🇸 USD</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2 py-1 bg-white">🇬🇧 GBP</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2 py-1 bg-white">🇪🇺 EUR</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2 py-1 bg-white">🇦🇺 AUD</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2 py-1 bg-white">🇨🇦 CAD</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2 py-1 bg-white">🇰🇪 KES</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2 py-1 bg-white">🇳🇬 NGN</span>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-ink-500">
                <span>Integrates with</span>
                <LogoMark label="QuickBooks" />
                <LogoMark label="Xero" />
                <LogoMark label="Plaid" />
                <LogoMark label="Paystack" />
                <span className="text-ink-400">Stripe / Square coming with your production keys</span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <HeroDashboardMock />
              <p className="mt-3 text-xs text-ink-500 text-center">Demo data shown · Real dashboard after connect</p>
            </div>
          </div>

        </div>
      </section>

      {/* AR AUDIT LEAD MAGNET */}
      <section className="bg-brand-600 text-white">
        <div className="container-page py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-200">Live product status</div>
              <h3 className="mt-1 text-xl font-display font-bold">What's live today — and what's next.</h3>
              <p className="mt-1 text-sm text-brand-100 max-w-xl">
                Live: AI dunning, AR aging dashboard, Plaid bank feeds, Paystack payments, Resend email, 4-week cash forecast.
                QuickBooks, Xero, Stripe, Square, and Twilio are wired and tested; we swap in your production credentials on the first setup call.
              </p>
            </div>
            <Link href="/integrations" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white text-brand-700 px-5 py-3 text-sm font-semibold hover:bg-brand-50 transition-colors shrink-0">
              See all integrations <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* HONEST TRUST STRIP */}
      <section className="border-y border-ink-200 bg-white">
        <div className="container-page py-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">Built in Nairobi · Honest about what ships when</p>
            <p className="mt-3 text-sm text-ink-700">
              No invented case studies. No fake metrics. Just a founder building the A/R tool he wished he'd had, and a small group of beta partners helping shape it.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-600">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> SOC 2 preparation in progress</span>
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
          <h2 className="mt-2 h2">Understands the conversation, not just the invoice.</h2>
          <p className="mt-4 lead">Collectly pauses when customers reply, tracks promises, separates disputes from cash flow problems, and tells you why each dollar is expected.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <HowItWorksCard
            step="1"
            icon={<Zap className="h-5 w-5 text-brand-600" />}
            title="Connect your books"
            body="QuickBooks and Xero OAuth routes are built. Plaid bank feeds are live. Paystack is live for NG/GH/KE/ZA. Stripe and Square are wired but still in test/sandbox for US/UK/AU/CA until production keys are swapped."
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
            <FeatureCard icon={<MessageSquare className="h-5 w-5 text-brand-600" />} title="Stop writing awkward follow-ups" body="AI writes tone-aware email and SMS reminders that sound like you, not a robot. Pause on reply. Pause on payment. Fully editable before send." />
            <FeatureCard icon={<FileText className="h-5 w-5 text-brand-600" />} title="One payment link. One place to pay." body="Customers click your branded portal, see every outstanding invoice, and settle with their preferred method. ACH, card, wire, and local rails." />
            <FeatureCard icon={<BarChart3 className="h-5 w-5 text-brand-600" />} title="Know if you can make payroll" body="Four-week cash forecast based on invoice age, customer payment history, and promised pay dates. See exactly when dollars are expected to land." />
            <FeatureCard icon={<Clock className="h-5 w-5 text-brand-600" />} title="See who owes what, right now" body="Live buckets: current, 1-30, 31-60, 61-90, 90+. Drill into any customer and see every overdue invoice without opening QuickBooks or Xero." />
            <FeatureCard icon={<ShieldCheck className="h-5 w-5 text-brand-600" />} title="Stop matching mystery payments" body="Incoming cash is auto-matched to the right invoice. No more 200 uncategorized transactions at month-end." />
            <FeatureCard icon={<Globe2 className="h-5 w-5 text-brand-600" />} title="Get paid in any major currency" body="USD, GBP, AUD, CAD, EUR, KES, NGN and more. Local payment methods for US, UK, EU, AU, CA, KE, NG, ZA." />
            <FeatureCard icon={<Bell className="h-5 w-5 text-brand-600" />} title="Alert the team where they work" body="Big invoices, big overdue, big new customers — ping Slack or email so nothing falls through the cracks." />
            <FeatureCard icon={<TrendingUp className="h-5 w-5 text-brand-600" />} title="Spot late-payers before they pay late" body="Risk score per customer based on history, disputes, and delays. Prioritize the high-value accounts that actually need attention." />
            <FeatureCard icon={<Users className="h-5 w-5 text-brand-600" />} title="Control who sees what" body="Owners, admins, members, viewers. Audit log for every action. Built for small teams with SOC 2-ready permissions." />
          </div>
        </div>
      </section>

      {/* AI DUNNING DEMO */}
      <section className="container-page py-20 sm:py-28">
        <div className="max-w-2xl mx-auto text-center">
          <p className="eyebrow">Try it now</p>
          <h2 className="mt-2 h2">See exactly what we'd send your customer.</h2>
          <p className="mt-4 lead">
            No signup. No data stored. Pick a tone, pick a channel, click generate.
            You'll see a sample message in our three voices. The production composer
            (in the dashboard) generates real, customer-specific copy with Gemini,
            then lets you edit before sending — this demo shows the structure and
            tone only, with placeholder names.
          </p>
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
          <div className="card">
            <div className="h-9 w-9 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
              <Calculator className="h-5 w-5 text-brand-600" />
            </div>
            <h3 className="font-semibold text-ink-900 mb-1.5">How much are late payments costing you?</h3>
            <p className="text-sm text-ink-600">2-minute calculator. Plug in your numbers and see what slow-paying customers are really costing your agency each year.</p>
            <Link href="/tools/ar-cost-calculator" className="mt-3 inline-flex text-sm font-semibold text-brand-700 hover:text-brand-800">
              Run the calculator →
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
            <PricingCard name="Founding Customer" price="$49" period="/mo" popular audience="First 20 customers · lifetime price lock" features={['All features unlocked', 'Founder onboarding call', 'Email + SMS dunning', 'Payment portal', 'Cash-flow forecast', 'Unlimited invoices', 'Priority support']} cta="Start free" />
            <PricingCard name="Growth" price="$99" period="/mo" audience="After founding cohort" features={['Everything in Founding', 'Multi-currency (USD, GBP, AUD, CAD, EUR, KES, NGN)', 'Up to 10 users', 'Advanced reporting', 'Custom workflows']} cta="Start free" />
          </div>
          <p className="mt-6 text-sm text-ink-400">Payment methods, SMS, and accounting integrations depend on region, provider approval, and production credentials. Availability will be confirmed before billing. Annual plans save 20%.</p>
        </div>
      </section>

      {/* COMPETITOR COST CALCULATOR */}
      <section className="container-page py-20 sm:py-28">
        <div className="max-w-4xl mx-auto text-center">
          <p className="eyebrow">The math speaks for itself</p>
          <h2 className="mt-2 h2">What you're probably paying today.</h2>
          <p className="mt-4 lead">Compare your current AR tool against a flat $49/mo. No per-user fees. No hidden transaction cuts.</p>
        </div>
        <div className="mt-12 overflow-x-auto rounded-2xl border border-ink-200 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-ink-50 text-ink-600">
              <tr>
                <th className="px-6 py-4 font-semibold">Cost at 1 year</th>
                <th className="px-6 py-4 font-semibold text-center">Collectly</th>
                <th className="px-6 py-4 font-semibold text-center">Chaser</th>
                <th className="px-6 py-4 font-semibold text-center">BILL</th>
                <th className="px-6 py-4 font-semibold text-center">Melio + manual work</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              <tr className="bg-white">
                <td className="px-6 py-4 font-medium text-ink-900">Annual platform cost</td>
                <td className="px-6 py-4 text-center font-bold text-emerald-700">$588</td>
                <td className="px-6 py-4 text-center">~$3,108+</td>
                <td className="px-6 py-4 text-center">$588 + per-user fees</td>
                <td className="px-6 py-4 text-center">$0 (AP-only)</td>
              </tr>
              <tr className="bg-ink-50">
                <td className="px-6 py-4 font-medium text-ink-900">Hidden transaction fees</td>
                <td className="px-6 py-4 text-center text-emerald-700">None ✅</td>
                <td className="px-6 py-4 text-center">None ✅</td>
                <td className="px-6 py-4 text-center">2.9% + 49¢ per payment ❌</td>
                <td className="px-6 py-4 text-center">ACH/card fees apply ❌</td>
              </tr>
              <tr className="bg-white">
                <td className="px-6 py-4 font-medium text-ink-900">Time to collect cash</td>
                <td className="px-6 py-4 text-center text-emerald-700">&lt; 1 day ✅</td>
                <td className="px-6 py-4 text-center">1–2 weeks ⚠️</td>
                <td className="px-6 py-4 text-center">1–2 weeks ⚠️</td>
                <td className="px-6 py-4 text-center">Manual reminders ⚠️</td>
              </tr>
              <tr className="bg-ink-50">
                <td className="px-6 py-4 font-medium text-ink-900">Built for 1–50 person service businesses</td>
                <td className="px-6 py-4 text-center text-emerald-700">✅ Yes</td>
                <td className="px-6 py-4 text-center">SMB-friendly ✅</td>
                <td className="px-6 py-4 text-center">Mid-market+ ❌</td>
                <td className="px-6 py-4 text-center">Freelancers only ⚠️</td>
              </tr>
              <tr className="bg-white">
                <td className="px-6 py-4 font-medium text-ink-900">Year 1 total (3 users, 100 invoices/mo)</td>
                <td className="px-6 py-4 text-center text-lg font-bold text-emerald-700">$588 ✅</td>
                <td className="px-6 py-4 text-center text-lg font-bold text-ink-900">$3,108+</td>
                <td className="px-6 py-4 text-center text-lg font-bold text-ink-900">$1,500–$2,500+</td>
                <td className="px-6 py-4 text-center text-lg font-bold text-ink-900">Unpredictable</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-center text-sm text-ink-500">Pricing estimates based on publicly listed tiers. Your actual costs may vary.</p>
      </section>

      {/* TESTIMONIAL — HONEST VERSION */}
      <section className="container-page py-20 sm:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <p className="eyebrow">Case studies</p>
          <h2 className="mt-2 h2">We don't have polished case studies yet.</h2>
          <p className="mt-4 lead">
            We're building Collectly with our first 20 customers. Real results, real screenshots, and real company names are coming in Q3 2026 — once beta partners have a full quarter of data.
          </p>
          <p className="mt-4 text-ink-600">
            Want to be one of the first case studies? We work closely with founding customers and your feedback shapes the product.
          </p>
          <div className="mt-6">
            <a href="mailto:founders@getcollectly.app?subject=Founding%20customer%20case%20study" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink-950 px-5 py-3 text-sm font-semibold text-white hover:bg-ink-800 transition-colors">
              Join the founding customer cohort <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* FOUNDER TRUST */}
      <section className="container-page py-20 sm:py-28">
        <div className="max-w-2xl mx-auto text-center">
          <p className="eyebrow">From the founder</p>
          <h2 className="mt-2 h2">I built this because I was tired of being the one who had to ask.</h2>
          <p className="mt-4 lead">
            I'm Davie, the founder of Collectly. I spent years building software and watching small teams lose hours every week to awkward invoice follow-ups, spreadsheets, and "just checking in" emails. Collectly is the tool I wish I'd had: honest pricing, fast setup, and follow-ups that don't make your customers hate you.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4 text-sm">
            <a href="https://www.linkedin.com/in/davie-mugambi/" target="_blank" rel="noopener noreferrer" className="link">LinkedIn →</a>
            <a href="https://x.com/daviemugambi" target="_blank" rel="noopener noreferrer" className="link">X / Twitter →</a>
            <a href="mailto:hello@getcollectly.app" className="link">hello@getcollectly.app →</a>
          </div>
        </div>
      </section>

      {/* RELATIONSHIP-AWARE FEATURES — THE DIFFERENTIATION */}
      <section className="bg-gradient-to-b from-ink-50 to-white border-y border-ink-200">
        <div className="container-page py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow">Why Collectly is different</p>
            <h2 className="mt-2 h2">Five things Collectly understands that other tools miss.</h2>
            <p className="mt-4 lead">Most AR tools treat every overdue invoice the same. Real service businesses know that customers, relationships, and reasons for late payment are different every time.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <DifferentiatorCard
              icon="📥"
              title="AI Collections Inbox"
              body="Every customer reply lands in one place. AI classifies replies: will pay on a date, already paid, disputed, missing PO, needs a plan, or no action. Then recommends the next step so you never wonder what to do."
            />
            <DifferentiatorCard
              icon="🤝"
              title="Promise-to-pay tracking"
              body={`When a customer says "we'll pay next Friday," Collectly extracts the date, pauses reminders, adds it to your forecast, and automatically restarts the sequence if payment doesn't arrive.`}
            />
            <DifferentiatorCard
              icon="⚠️"
              title="Dispute and blocker management"
              body="Give customers a way to flag 'I already paid,' 'need an invoice copy,' 'amount is wrong,' or 'waiting for approval.' The invoice automatically leaves the normal dunning and enters a resolution workflow."
            />
            <DifferentiatorCard
              icon="📊"
              title="Explainable cash forecast"
              body="See exactly why each dollar is expected: $14K from confirmed promises, $12K from customers who always pay on time, $8K is uncertain because two invoices are disputed. Switch between conservative, expected, and optimistic."
            />
            <DifferentiatorCard
              icon="🎯"
              title="Relationship-aware dunning"
              body="Set tone, channel, account-manager sender, and sensitivity per customer. A strategic account gets gentle handling. A high-risk account gets firm follow-up. Collectly never treats every overdue invoice as ordinary debt."
            />
            <DifferentiatorCard
              icon="⏸️"
              title="Approval-before-send"
              body="Nervous about automated emails? Turn on approval mode. Collectly drafts every reminder, you review and approve. Build confidence, then graduate to autopilot when ready."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="card-lg grad-mesh text-center overflow-hidden">
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-3">
            <p className="text-sm sm:text-base font-semibold text-emerald-800">
              ✅ No credit card required · ✅ 14-day free trial · ✅ Cancel anytime · ✅ Setup in 10 minutes
            </p>
          </div>
          <div className="px-6 py-12">
            <h2 className="h2">Stop being the one who has to ask.</h2>
            <p className="mt-4 lead max-w-xl mx-auto">
              Join 20 founding customers and stop wasting hours every week chasing invoices. If Collectly doesn't show you a clear path to faster payments in 14 days, walk away.
            </p>
            <div className="mt-6 max-w-md mx-auto">
              <Link href="/sign-up" className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-ink-950 px-5 py-3 text-sm font-semibold text-white hover:bg-ink-800 transition-colors">
                Start free 14-day trial <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-3 text-xs text-ink-500">Founding customer price locks at $49/mo forever. After 20 customers, the Growth plan is $99/mo.</p>
          </div>
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

function DifferentiatorCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="card-lg">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-display font-bold text-lg text-ink-950 mb-2">{title}</h3>
      <p className="text-sm text-ink-700 leading-relaxed">{body}</p>
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
              { c: 'Acme Corp', a: '$24,500', d: 4, b: '1-30' },
              { c: 'Design Studio LLC', a: '$8,200', d: 12, b: '1-30' },
              { c: 'Consulting Group', a: '$42,000', d: 38, b: '31-60' },
              { c: 'Tech Partners Inc', a: '$15,750', d: 67, b: '61-90' },
              { c: 'Global Services Ltd', a: '$93,800', d: 95, b: '90+' },
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
        <div className="text-[11px] text-ink-500">From Consulting Group — 12 min ago</div>
      </div>
    </div>
  );
}
