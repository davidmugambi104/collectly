import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { WaitlistForm } from '@/components/marketing/waitlist';
import { Button } from '@/components/ui/button';
import { ComparisonTable } from '@/components/marketing/comparison-table';
import Link from 'next/link';
import { Check, X, ArrowRight, DollarSign, Layers, Target, Receipt } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';

export const metadata = pageMetadata({
  title: 'Collectly vs BILL — dedicated AR automation vs all-in-one FinOps',
  description:
    'Side-by-side of Collectly and BILL for accounts-receivable automation. ' +
    'BILL bundles AP, AR, and spend at $49 per user/month plus transaction ' +
    'fees. Collectly is AR-native, flat $49/mo for the founding tier, no ' +
    'per-invoice fees, built for 5-30 person agencies and consultancies.',
  path: '/vs-bill',
  image: '/og-vs-bill.png',
  keywords: ['Collectly vs BILL', 'BILL alternative', 'AR automation', 'BILL vs Collectly'],
});

const DIFFS = [
  { icon: Layers, label: 'Scope', collectly: 'AR-only — deep dunning, forecasting, risk scoring', bill: 'AP + AR + spend/expense platform' },
  { icon: DollarSign, label: 'Pricing', collectly: '$49/mo flat, no per-invoice fees', bill: '$49/user/mo + ACH/card/wire fees' },
  { icon: Target, label: 'Best for', collectly: '5-30 person agencies and consultancies', bill: 'SMBs and accounting firms needing broad FinOps' },
  { icon: Receipt, label: 'AR depth', collectly: 'Tone-aware AI dunning + AR aging + cashflow forecast', bill: 'Invoicing, reminders, payment acceptance' },
];

export default function VsBillPage() {
  return (
    <div className="min-h-screen">
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Compare', path: '/compare' },
          { name: 'vs BILL', path: '/vs-bill' },
        ]}
      />
      <MarketingHeader />

      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">Comparison</p>
        <h1 className="mt-3 h1">Collectly vs BILL</h1>
        <p className="mt-5 lead">
          BILL is a powerful all-in-one financial operations platform: AP, AR, cards, spend, and credit lines.
          But if your main pain point is overdue invoices, Collectly is the simpler, AR-native choice:
          flat $49/mo, no per-user charges, no per-invoice fees, and follow-up engineered for agencies and consultancies.
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
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">BILL</div>
                <div className="text-sm text-ink-600">{d.bill}</div>
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
          <h2 className="h2 text-center">How BILL built its clientele</h2>
          <p className="mt-4 text-center text-ink-600">BILL became a platform by combining AP, AR, cards, and credit lines — then distributing through accountants.</p>
          <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm text-ink-700">
            <div className="card">
              <div className="font-semibold text-ink-900">Accountant/bookkeeper channel</div>
              <p className="mt-1">BILL's biggest growth engine is the accounting firm: one bookkeeper can roll it out to dozens of clients.</p>
            </div>
            <div className="card">
              <div className="font-semibold text-ink-900">M&A expansion</div>
              <p className="mt-1">Acquired Divvy (spend cards), Invoice2go, and others to become an "all-in-one" financial operations platform.</p>
            </div>
            <div className="card">
              <div className="font-semibold text-ink-900">Credit lines as hook</div>
              <p className="mt-1">Offers $1K–$5M credit lines embedded in the platform, giving cash-strapped SMBs a reason to sign up.</p>
            </div>
            <div className="card">
              <div className="font-semibold text-ink-900">Deep ERP integrations</div>
              <p className="mt-1">Two-way sync with QBO, Xero, NetSuite, Sage Intacct, and Dynamics makes switching friction low for mid-market.</p>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-ink-600">
            <strong>For Collectly:</strong> BILL wins by bundling everything. Collectly wins by staying narrow: easier setup, no per-user fees, and AR messaging that doesn't feel like a bank portal.
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
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />AR is your top cash-flow pain point</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You want flat pricing without per-user or per-transaction fees</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You want tone-aware, empathetic dunning</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You need cash-flow forecasting and risk scoring tied to invoices</li>
              </ul>
            </div>
            <div className="card">
              <div className="text-sm font-semibold text-ink-700 mb-2">Choose BILL if...</div>
              <ul className="space-y-2 text-sm text-ink-700">
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />You want one platform for AP, AR, cards, and expense management</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />You need credit lines, vendor payments, or employee cards</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />You use NetSuite/Sage Intacct/Acumatica and want deep ERP sync</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />You have an accounting firm managing many clients</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="card-lg grad-mesh text-center">
          <h2 className="h2">AR-first, not finance-everything</h2>
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
