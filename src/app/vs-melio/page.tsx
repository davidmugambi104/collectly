import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { WaitlistForm } from '@/components/marketing/waitlist';
import { Button } from '@/components/ui/button';
import { ComparisonTable } from '@/components/marketing/comparison-table';
import Link from 'next/link';
import { Check, ArrowRight, DollarSign, RefreshCw, Target, CreditCard } from 'lucide-react';

export const metadata = {
  title: 'Collectly vs Melio — AR automation beyond payment links',
  description: 'Melio is free for AP-first B2B payments with light invoicing. Collectly is AR-native: AI tone-aware dunning, cash-flow forecast, risk scoring, and a branded payment portal for $49/mo.',
};

const DIFFS = [
  { icon: RefreshCw, label: 'Primary focus', collectly: 'AR automation and collections', melio: 'AP-first bill pay + light invoicing' },
  { icon: DollarSign, label: 'Starting price', collectly: '$49/mo flat', melio: '$0/mo (free ACH limits, then fees)' },
  { icon: Target, label: 'Collections AI', collectly: 'Tone-aware email + SMS dunning', melio: 'Payment links + basic reminders' },
  { icon: CreditCard, label: 'Payment portal', collectly: 'Branded AR portal with dunning context', melio: 'Invoice payment links' },
];

export default function VsMelioPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">Comparison</p>
        <h1 className="mt-3 h1">Collectly vs Melio</h1>
        <p className="mt-5 lead">
          Melio is a great way to pay bills and send free invoices. But if your real problem is
          overdue invoices, awkward follow-ups, and unpredictable cash flow, Collectly is built for that.
          AI tone-aware dunning, cash-flow forecasting, customer risk scoring — for a flat $49/mo.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sign-up">
            <Button className="gap-1.5">Start free trial <ArrowRight className="h-4 w-4" /></Button>
          </Link>
          <Link href="/pricing">
            <Button variant="secondary">See pricing</Button>
          </Link>
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DIFFS.map((d) => (
            <div key={d.label} className="card">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                <d.icon className="h-4 w-4 text-brand-600" /> {d.label}
              </div>
              <div className="mt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Collectly</div>
                <div className="text-sm text-ink-900">{d.collectly}</div>
              </div>
              <div className="mt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Melio</div>
                <div className="text-sm text-ink-600">{d.melio}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <ComparisonTable />
      </section>

      <section className="bg-ink-50 border-y border-ink-200">
        <div className="container-page py-16 max-w-3xl">
          <h2 className="h2 text-center">How Melio built its clientele</h2>
          <p className="mt-4 text-center text-ink-600">Melio grew by making B2B payments free and simple, then layering on invoicing and AR features.</p>
          <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm text-ink-700">
            <div className="card">
              <div className="font-semibold text-ink-900">Free-forever entry plan</div>
              <p className="mt-1">A $0/mo "Go" plan with free ACH transfers removes all signup friction and gets SMBs in the door fast.</p>
            </div>
            <div className="card">
              <div className="font-semibold text-ink-900">AP-first viral loop</div>
              <p className="mt-1">Paying a vendor through Melio invites that vendor to join, creating organic network growth in small-business networks.</p>
            </div>
            <div className="card">
              <div className="font-semibold text-ink-900">Accountant channel</div>
              <p className="mt-1">Accountants recommend Melio for client AP workflows, making it a default choice inside bookkeeping practices.</p>
            </div>
            <div className="card">
              <div className="font-semibold text-ink-900">Simple UX + heavy marketing</div>
              <p className="mt-1">Bright, friendly brand and straightforward flows made Melio approachable for non-finance founders.</p>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-ink-600">
            <strong>For Collectly:</strong> Melio owns AP. Collectly should own the emotional pain of AR — and make the ROI of faster collections obvious with the public ROI calculator.
          </div>
        </div>
      </section>

      <section className="bg-ink-50 border-y border-ink-200">
        <div className="container-page py-16 max-w-3xl">
          <h2 className="h2 text-center">When to choose which</h2>
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="card">
              <div className="text-sm font-semibold text-emerald-700 mb-2">Choose Collectly if...</div>
              <ul className="space-y-2 text-sm text-ink-700">
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />Late invoices are hurting your cash flow</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You want AI to write polite-but-firm follow-ups</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You need a 4-week cash-flow forecast</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You want risk scoring per customer</li>
              </ul>
            </div>
            <div className="card">
              <div className="text-sm font-semibold text-ink-700 mb-2">Choose Melio if...</div>
              <ul className="space-y-2 text-sm text-ink-700">
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />Your main need is paying vendors and bills</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />You want a free plan for basic invoicing</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />AP automation matters more than collections</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />You only need simple payment links today</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="card-lg grad-mesh text-center">
          <h2 className="h2">Don't let free invoicing become slow collections</h2>
          <p className="mt-4 lead">Start your 14-day free trial. No credit card. See exactly what Collectly would send your customers in 10 minutes.</p>
          <div className="mt-6 max-w-md mx-auto">
            <WaitlistForm />
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
