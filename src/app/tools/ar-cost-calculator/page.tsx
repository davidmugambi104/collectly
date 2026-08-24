import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { ArCostCalculator } from './client';

export const metadata: Metadata = {
  title: 'Late Payment Cost Calculator — How much is your agency losing?',
  description: 'Free 2-minute calculator: see how much late invoices and manual chasing are costing your agency every year. Built for 5-30 person agencies and consultancies.',
  keywords: ['late payment cost', 'agency cash flow', 'invoice chasing cost', 'AR calculator', 'accounts receivable calculator'],
  openGraph: {
    title: 'Late Payment Cost Calculator — Collectly',
    description: 'See how much late invoices and manual chasing cost your agency every year. Free, no signup required.',
  },
};

export default function ArCostCalculatorPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-gradient-to-b from-white to-ink-50">
        <section className="max-w-5xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider">Free tool · 2 minutes</p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-display font-bold text-ink-950 tracking-tight">
              How much are late payments costing your agency?
            </h1>
            <p className="mt-4 text-lg text-ink-600">
              Most small agencies lose $10,000–$50,000 a year to late invoices and the hours spent chasing them. Plug in your numbers.
            </p>
          </div>
          <ArCostCalculator />
          <p className="mt-10 text-center text-sm text-ink-500 max-w-xl mx-auto">
            Methodology: revenue at risk is estimated using a conservative 8% annual cost of capital on the cash tied up in late invoices. Time cost is based on your hourly rate × hours spent chasing per week.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <Link href="/tools/ar-roi" className="card hover:border-brand-300 transition-colors text-center">
              <div className="text-sm font-semibold text-ink-900">See your A/R ROI →</div>
              <p className="mt-1 text-xs text-ink-600">How much faster collections would free up.</p>
            </Link>
            <Link href="/ar-audit" className="card hover:border-brand-300 transition-colors text-center">
              <div className="text-sm font-semibold text-ink-900">Get a free audit →</div>
              <p className="mt-1 text-xs text-ink-600">We&apos;ll reply with 3 specific cash-flow fixes.</p>
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
