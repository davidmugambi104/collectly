import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';

import { DunningDemo } from '@/components/marketing/dunning-demo';
import { ComparisonTable } from '@/components/marketing/comparison-table';
import {
  ArrowRight, Sparkles, ShieldCheck, Clock, MessageSquare, Mail,
  Bot, BarChart3, CheckCircle2, Globe2, Zap, FileText, Wallet,
} from 'lucide-react';
import { pageMetadata, faqJsonLd } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Stop chasing late invoices — AR automation for small agencies',
  description:
    'Connect Collectly to Xero or QuickBooks. It drafts client-safe invoice ' +
    'reminders, pauses when customers reply or pay, tracks promised-payment ' +
    'dates, and separates disputes from ordinary late payment. Built for ' +
    '5-30 person agencies and consultancies. From $49/mo flat.',
  path: '/',
  keywords: [
    'Xero invoice reminder',
    'QuickBooks AR automation',
    'agency invoice chasing',
    'Chaser alternative',
    'AI dunning for small business',
    'promise to pay tracking',
  ],
});

// Homepage FAQ — matches "what is", "does it work with X", "how much" type
// queries. Renders as FAQPage JSON-LD; does not duplicate copy visible below.
const homeJsonLd = JSON.stringify(
  faqJsonLd([
    {
      q: 'Does Collectly work with Xero?',
      a: 'Yes. Collectly connects to Xero via official OAuth, reads open invoices, contacts, due dates and payment status, and writes back the payment-pause marker. Xero integration is the most-tested connection in the product.',
    },
    {
      q: 'Does Collectly work with QuickBooks?',
      a: 'QuickBooks Online integration is currently in beta while we complete the Intuit production credentials. Same workflow as Xero (OAuth, invoice sync, payment pause, reply detection); available on request for founding customers.',
    },
    {
      q: 'How is Collectly different from Chaser?',
      a: 'Chaser is built around templated reminder sequences and starts around $259/mo. Collectly is built for 5-30 person agencies and uses tone-aware AI to write each reminder in context, pauses on reply-or-pay automatically, classifies disputes, and tracks promised payment dates — starting at $49/mo flat with no per-invoice fees.',
    },
    {
      q: 'How much does Collectly cost?',
      a: 'Founding-customer pricing is $49/mo flat for the first 20 signups (locked for life). After that, plans start at $99/mo for one Xero organization. SMS charged at pass-through cost; no per-invoice fees, no setup fees.',
    },
    {
      q: 'Will Collectly send messages without my approval?',
      a: 'By default, no. Every founding customer runs in approval mode — nothing goes out until you review and send. Autopilot unlocks after 25 reviewed messages with no unedited-send rate over a 14-day window, and can be turned off any time.',
    },
    {
      q: 'What happens when a customer replies "we\'ll pay next Friday"?',
      a: 'Collectly detects the reply, pauses the reminder sequence, extracts the promised date, and asks a human to confirm before logging it. The promised date shows up in your work queue. After that Friday passes without payment, the next reminder is queued — not auto-sent.',
    },
  ]),
);

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: homeJsonLd }} />
      <MarketingHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grad-hero" />
        <div className="absolute inset-0 ring-grid opacity-30" />
        <div className="container-page relative pt-16 pb-20 sm:pt-20 sm:pb-28">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/80 backdrop-blur px-3 py-1 text-xs font-medium text-ink-700">
                <Sparkles className="h-3.5 w-3.5 text-brand-600" /> Pre-launch · founding cohort of 20 · built in Nairobi
              </div>
              <h1 className="mt-5 h1">
                Stop chasing late invoices.
                <br />
                <span className="text-2xl sm:text-3xl font-normal text-ink-700">AI follow-ups for 5–30 person agencies and consultancies on Xero.</span>
              </h1>
              <p className="mt-5 lead max-w-xl">
                Collectly connects to Xero (QuickBooks in beta), identifies overdue invoices, and sends
                tone-aware email and SMS follow-ups. It pauses when customers reply or pay. You review and
                approve, or let it run on autopilot. Built for agencies and consultancies with no full-time
                credit controller.
              </p>

              <div className="mt-6 inline-flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 backdrop-blur px-4 py-3 text-sm text-emerald-900 shadow-sm">
                <span className="font-bold">$49/mo · 14-day trial · No per-invoice fees</span>
                <span className="hidden sm:inline text-emerald-300">|</span>
                <span className="text-emerald-700">Chaser starts at ~$259/mo · BILL charges per user + transaction fees</span>
              </div>
              <p className="mt-2 text-xs text-ink-500">First 20 customers lock in $49/mo forever · founder-assisted setup · cancel anytime.</p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3 max-w-lg">
                <Link href="/sign-up" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink-950 px-5 py-3 text-sm font-semibold text-white hover:bg-ink-800 transition-colors">
                  Start founding trial <ArrowRight className="h-4 w-4" />
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

      {/* LIVE PRODUCT STATUS */}
      <section className="bg-brand-600 text-white">
        <div className="container-page py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-200">Live product status</div>
              <h3 className="mt-1 text-xl font-display font-bold">What&apos;s live today — and what&apos;s next.</h3>
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
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">Honest about what ships when</p>
            <p className="mt-3 text-sm text-ink-700">
              No invented case studies. No fake metrics. Just a founder building the A/R tool he wished he&apos;d had, pre-launch and recruiting the first founding cohort.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-600">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> SOC 2 Type II preparation in progress</span>
              <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5 text-emerald-600" /> Global payment rails</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-emerald-600" /> 10-minute setup</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — connected steps, not another card grid */}
      <section className="container-page py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 h2">Understands the conversation, not just the invoice.</h2>
          <p className="mt-4 lead">Collectly pauses when customers reply, tracks promises, separates disputes from cash flow problems, and tells you why each dollar is expected.</p>
        </div>
        <ol className="mt-14 grid md:grid-cols-3 gap-x-8 gap-y-10 relative">
          <div className="hidden md:block absolute top-5 left-[16.5%] right-[16.5%] h-px bg-ink-200" aria-hidden="true" />
          <TimelineStep
            n={1}
            icon={<Zap className="h-4 w-4" />}
            title="Connect your books"
            body="QuickBooks and Xero OAuth routes are built. Plaid bank feeds are live. Paystack is live for NG/GH/KE/ZA. Stripe and Square are wired but still in test/sandbox until production keys are swapped in."
          />
          <TimelineStep
            n={2}
            icon={<Bot className="h-4 w-4" />}
            title="Set the tone"
            body="Pick how firm Collectly should be — friendly, firm, final — when to escalate, and which invoices to leave alone entirely. You set the boundary; Collectly stays inside it."
          />
          <TimelineStep
            n={3}
            icon={<Wallet className="h-4 w-4" />}
            title="Get paid"
            body="Customers pay through a branded portal. Cash auto-matches to invoices. You see the 4-week cash-flow forecast in real time instead of asking who paid in every team meeting."
          />
        </ol>
      </section>

      {/* FEATURE GRID */}
      <section className="bg-ink-50 border-y border-ink-200">
        <div className="container-page py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow">Features</p>
            <h2 className="mt-2 h2">The parts that actually save you time.</h2>
            <p className="mt-4 lead">Designed for 5–30 person agencies and consultancies on Xero. Priced for the long tail.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon={<MessageSquare className="h-5 w-5 text-brand-600" />} title="Reminders that don't sound like a robot" body="AI writes tone-aware email and SMS reminders in your voice, pauses on reply or payment automatically, and stays fully editable before anything sends." />
            <FeatureCard icon={<FileText className="h-5 w-5 text-brand-600" />} title="A single branded link to get paid" body="Customers see every outstanding invoice in one portal and settle with their preferred method — ACH, card, wire, or local rails." />
            <FeatureCard icon={<BarChart3 className="h-5 w-5 text-brand-600" />} title="Know if you can make payroll" body="Four-week cash forecast based on invoice age, customer payment history, and promised pay dates. See exactly when dollars are expected to land." />
            <FeatureCard icon={<Clock className="h-5 w-5 text-brand-600" />} title="See who owes what, right now" body="Live buckets: current, 1-30, 31-60, 61-90, 90+. Drill into any customer without opening QuickBooks or Xero." />
            <FeatureCard icon={<ShieldCheck className="h-5 w-5 text-brand-600" />} title="Cash lands in the right invoice automatically" body="Incoming payments are matched the moment they arrive — no reconciling 200 uncategorized transactions at month-end." />
            <FeatureCard icon={<Globe2 className="h-5 w-5 text-brand-600" />} title="Every major currency, one dashboard" body="USD, GBP, AUD, CAD, EUR, KES, NGN and more, with local payment methods per region." />
          </div>
        </div>
      </section>

      {/* AI DUNNING DEMO */}
      <section className="container-page py-20 sm:py-28">
        <div className="max-w-2xl mx-auto text-center">
          <p className="eyebrow">Try it now</p>
          <h2 className="mt-2 h2">See exactly what we&apos;d send your customer.</h2>
          <p className="mt-4 lead">
            No signup. No data stored. Pick a tone, pick a channel, click generate.
            You&apos;ll see a sample message in our three voices. The production composer
            (in the dashboard) generates real, customer-specific copy with Gemini,
            then lets you edit before sending — this demo shows the structure and
            tone only, with placeholder names.
          </p>
        </div>
        <div className="mt-10 max-w-5xl mx-auto">
          <DunningDemo />
        </div>
      </section>

      {/* COMPARISON — feature table + cost breakdown, one section */}
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

        <div className="mt-16 max-w-2xl">
          <h3 className="h3">What that looks like over a year</h3>
          <p className="mt-2 text-sm text-ink-600">Same feature gap, in dollars. Estimates based on publicly listed tiers — your actual costs may vary.</p>
        </div>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-200 shadow-sm">
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
                <td className="px-6 py-4 text-center text-emerald-700">None</td>
                <td className="px-6 py-4 text-center">None</td>
                <td className="px-6 py-4 text-center">2.9% + 49¢ per payment</td>
                <td className="px-6 py-4 text-center">ACH/card fees apply</td>
              </tr>
              <tr className="bg-white">
                <td className="px-6 py-4 font-medium text-ink-900">Time to collect cash</td>
                <td className="px-6 py-4 text-center text-emerald-700">&lt; 1 day</td>
                <td className="px-6 py-4 text-center">1–2 weeks</td>
                <td className="px-6 py-4 text-center">1–2 weeks</td>
                <td className="px-6 py-4 text-center">Manual reminders</td>
              </tr>
              <tr className="bg-ink-50">
                <td className="px-6 py-4 font-medium text-ink-900">Year 1 total (3 users, 100 invoices/mo)</td>
                <td className="px-6 py-4 text-center text-lg font-bold text-emerald-700">$588</td>
                <td className="px-6 py-4 text-center text-lg font-bold text-ink-900">$3,108+</td>
                <td className="px-6 py-4 text-center text-lg font-bold text-ink-900">$1,500–$2,500+</td>
                <td className="px-6 py-4 text-center text-lg font-bold text-ink-900">Unpredictable</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-ink-950 text-white">
        <div className="container-page py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Pricing</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-display font-bold tracking-tight">Honest pricing. No per-invoice fees. No setup costs.</h2>
            <p className="mt-4 text-lg text-ink-300">14-day trial, founder-assisted setup. Upgrade when you&apos;re hooked. Cancel anytime.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            <PricingCard name="Founding Customer" price="$49" period="/mo" popular audience="First 20 customers · lifetime price lock" features={['All features unlocked', 'Founder onboarding call', 'Email + SMS dunning', 'Payment portal', 'Cash-flow forecast', 'Unlimited invoices', 'Priority support']} cta="Start founding trial" />
            <PricingCard name="Growth" price="$99" period="/mo" audience="After founding cohort" features={['Everything in Founding', 'Multi-currency (USD, GBP, AUD, CAD, EUR, KES, NGN)', 'Up to 10 users', 'Advanced reporting', 'Custom workflows']} cta="Start free trial" />
          </div>
          <p className="mt-6 text-sm text-ink-400">Payment methods, SMS, and accounting integrations depend on region, provider approval, and production credentials. Availability will be confirmed before billing. Annual plans save 20%.</p>
        </div>
      </section>

      {/* WHY DIFFERENT */}
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

      {/* FOUNDER NOTE — a letter, not another eyebrow/h2/grid section */}
      <section className="container-page py-20 sm:py-28">
        <div className="max-w-2xl mx-auto">
          <span className="font-display text-6xl text-brand-200 leading-none select-none">&quot;</span>
          <p className="-mt-6 text-xl sm:text-2xl font-display text-ink-900 leading-snug">
            I built this because I was tired of being the one who had to ask.
          </p>
          <p className="mt-5 text-ink-600 leading-relaxed">
            I&apos;m Davie, the founder of Collectly. I spent years building software and watching small teams
            lose hours every week to awkward invoice follow-ups, spreadsheets, and &quot;just checking in&quot; emails.
            Collectly is the tool I wish I&apos;d had: honest pricing, fast setup, and follow-ups that don&apos;t make
            your customers hate you.
          </p>
          <p className="mt-4 text-sm text-ink-500">
            We don&apos;t have polished case studies yet — we&apos;re building this with our first 20 customers, and
            real results with real company names are coming once beta partners have a full quarter of data.
            Want to be one of them? Your feedback shapes what ships next.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <a href="https://www.linkedin.com/in/davie-mugambi/" target="_blank" rel="noopener noreferrer" className="link">LinkedIn →</a>
            <a href="https://x.com/daviemugambi" target="_blank" rel="noopener noreferrer" className="link">X / Twitter →</a>
            <a href="mailto:founders@getcollectly.app?subject=Founding%20customer%20case%20study" className="link">Join the founding cohort →</a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="card-lg grad-mesh text-center overflow-hidden">
          <div className="px-6 pt-10">
            <h2 className="h2">See your own invoices in it before you decide.</h2>
            <p className="mt-4 lead max-w-xl mx-auto">
              Connect Xero or QuickBooks, watch it draft reminders for your actual overdue invoices, and decide
              from there. If it&apos;s not clearly saving you time by day 14, cancel — no retention call.
            </p>
            <div className="mt-6 max-w-md mx-auto">
              <Link href="/sign-up" className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-ink-950 px-5 py-3 text-sm font-semibold text-white hover:bg-ink-800 transition-colors">
                Start founding trial <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-3 text-xs text-ink-500">Founding customer price locks at $49/mo forever. After 20 customers, the Growth plan is $99/mo.</p>
          </div>
          <div className="mt-8 border-t border-ink-200/60 px-6 py-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-700">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> No credit card required</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Data stays yours — disconnect anytime</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Not ready? <Link href="/ar-audit" className="link">Get a free AR audit</Link> instead</span>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

/* ----------------------------- Components ----------------------------- */

function LogoMark({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500">
      <span className="h-1.5 w-1.5 rounded-full bg-ink-300" />{label}
    </span>
  );
}

function TimelineStep({ n, icon, title, body }: { n: number; icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="relative">
      <div className="relative z-10 h-10 w-10 rounded-full bg-ink-950 text-white flex items-center justify-center font-display font-bold">{n}</div>
      <div className="mt-4 flex items-center gap-2">
        <span className="text-brand-600">{icon}</span>
        <h3 className="h3">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-ink-600 leading-relaxed">{body}</p>
    </li>
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
          <div className="mx-auto text-xs text-ink-500 font-medium">getcollectly.app/dashboard</div>
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
