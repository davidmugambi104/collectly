import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { WaitlistForm } from '@/components/marketing/waitlist';
import { Button } from '@/components/ui/button';
import { ComparisonTable } from '@/components/marketing/comparison-table';
import Link from 'next/link';
import { Check, ArrowRight, Bot, DollarSign, Target, LineChart } from 'lucide-react';

import { pageMetadata } from '@/lib/seo';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';

export const metadata = pageMetadata({
  title: 'Collectly vs QuickBooks — smarter AR automation for QBO users',
  description:
    'QuickBooks handles invoicing and payments but not smart collections. ' +
    'Collectly adds AI tone-aware AI dunning, AR aging, cash-flow forecasting, ' +
    'and a branded payment portal while keeping your QuickBooks data in sync.',
  path: '/vs-quickbooks',
  image: '/og-vs-quickbooks.png',
  keywords: ['Collectly vs QuickBooks', 'QuickBooks AR', 'QuickBooks invoice reminder', 'QBO dunning'],
});

const DIFFS = [
  { icon: Bot, label: 'Collections AI', collectly: 'Tone-aware email + SMS dunning', quickbooks: 'Basic payment reminders' },
  { icon: DollarSign, label: 'Cost', collectly: '$49/mo flat, no per-invoice fees', quickbooks: '$0/mo + payment processing fees' },
  { icon: LineChart, label: 'Forecasting', collectly: '4-week AR cash-flow forecast', quickbooks: 'Basic reporting only' },
  { icon: Target, label: 'Best for', collectly: 'Businesses serious about reducing DSO', quickbooks: 'Businesses already living in QBO' },
];

export default function VsQuickbooksPage() {
  return (
    <div className="min-h-screen">
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Compare', path: '/compare' },
          { name: 'vs QuickBooks', path: '/vs-quickbooks' },
        ]}
      />
      <MarketingHeader />

      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">Comparison</p>
        <h1 className="mt-3 h1">Collectly vs QuickBooks</h1>
        <p className="mt-5 lead">
          QuickBooks is the default for small-business invoicing and payments. But its collections features
          are basic — reminders, not real dunning. Collectly sits on top of Xero (production-ready today) or
          QuickBooks (integration in beta) to add AI tone-aware follow-ups, AR aging, cash-flow forecasting,
          and risk scoring — without forcing you to migrate.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sign-up">
            <Button className="gap-1.5">Start founding trial <ArrowRight className="h-4 w-4" /></Button>
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
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">QuickBooks</div>
                <div className="text-sm text-ink-600">{d.quickbooks}</div>
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
          <h2 className="h2 text-center">How QuickBooks built its clientele</h2>
          <p className="mt-4 text-center text-ink-600">QuickBooks is the default because it owns the small-business bookkeeping workflow and cross-sells from there.</p>
          <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm text-ink-700">
            <div className="card">
              <div className="font-semibold text-ink-900">Ecosystem lock-in</div>
              <p className="mt-1">QBO users already have their customers, invoices, and books in one place, so Payments is the obvious next click.</p>
            </div>
            <div className="card">
              <div className="font-semibold text-ink-900">Accountant + ProAdvisor network</div>
              <p className="mt-1">Intuit's ProAdvisor program turns bookkeepers and accountants into a massive unpaid salesforce for QuickBooks products.</p>
            </div>
            <div className="card">
              <div className="font-semibold text-ink-900">Brand trust and ubiquity</div>
              <p className="mt-1">"It's QuickBooks" is enough for many SMBs. Decades of market presence make it the safe default.</p>
            </div>
            <div className="card">
              <div className="font-semibold text-ink-900">Transaction-fee model</div>
              <p className="mt-1">No monthly fee for basic payments means it wins on simplicity, even when features are shallow.</p>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-ink-600">
            <strong>For Collectly:</strong> Don't fight QuickBooks on invoicing — augment it. Position as the "collections layer" that syncs with QBO and turns reminders into real dunning.
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
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You have overdue invoices sitting 30+ days</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You want AI to adapt tone per customer and overdue stage</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You need a 4-week cash-flow forecast tied to actual invoices</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You want risk scores to prioritize who to chase first</li>
              </ul>
            </div>
            <div className="card">
              <div className="text-sm font-semibold text-ink-700 mb-2">Choose QuickBooks if...</div>
              <ul className="space-y-2 text-sm text-ink-700">
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />Your collections needs are simple and occasional</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />You only want one tool and one login</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />You already use QuickBooks Payments and don't want to switch</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />You want payment acceptance tightly embedded in QBO</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="card-lg grad-mesh text-center">
          <h2 className="h2">Keep QuickBooks. Upgrade your collections.</h2>
          <p className="mt-4 lead">Start your 14-day free trial. No credit card. QuickBooks integration is in beta — Xero connects in under a minute today.</p>
          <div className="mt-6 max-w-md mx-auto">
            <WaitlistForm />
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
