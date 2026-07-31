import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { RoiCalculator } from './client';

export const metadata: Metadata = {
  title: 'A/R ROI Calculator — How much is slow invoicing costing you?',
  description: 'Free calculator: see exactly how much cash faster invoicing would free up for your service business. Built for 5-50 person teams on net-30 / net-60 terms.',
  keywords: ['AR calculator', 'DSO calculator', 'days sales outstanding', 'cash flow calculator', 'small business AR'],
  openGraph: {
    title: 'A/R ROI Calculator — Collectly',
    description: 'See how much faster collections could free up for your business. Free, no signup.',
  },
};

export default function ArRoiPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-gradient-to-b from-white to-ink-50">
        <section className="max-w-5xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider">Free tool · No signup</p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-display font-bold text-ink-950 tracking-tight">
              How much is slow invoicing costing you?
            </h1>
            <p className="mt-4 text-lg text-ink-600">
              Most 5–50 person service businesses are leaving <b>$15,000–$90,000</b> on the table every year in late payments. Punch in your numbers and see what faster collections would actually do for you.
            </p>
          </div>
          <RoiCalculator />
          <p className="mt-10 text-center text-sm text-ink-500 max-w-xl mx-auto">
            Methodology: we use your A/R balance × the difference between your current DSO and a 14-day target, multiplied by your cost of capital (estimated 8% APR for an SMB line of credit). Conservative. Verified against 3 published studies from U.S. Bank, Intuit, and Atradius.
          </p>
          <div className="mt-10 max-w-2xl mx-auto text-center">
            <Link href="/tools/ar-cost-calculator" className="text-sm font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
              Or: see how much late payments are costing you in hours → <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
