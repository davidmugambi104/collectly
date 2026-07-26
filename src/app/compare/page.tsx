import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { ComparisonTable } from '@/components/marketing/comparison-table';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';

export const metadata = {
  title: 'Compare Collectly vs AR automation competitors',
  description:
    'Side-by-side comparisons of Collectly vs Chaser, BILL, Melio, QuickBooks, Gaviti, Growfin, HighRadius, FreshBooks, and more. Built for small B2B service businesses on QBO or Xero.',
};

const COMPARISONS = [
  { href: '/vs-chaser', name: 'Chaser', pitch: 'SMB receivables automation starting at ~$259/mo.' },
  { href: '/vs-bill', name: 'BILL', pitch: 'All-in-one AP + AR + spend platform with per-user pricing.' },
  { href: '/vs-melio', name: 'Melio', pitch: 'Free AP-first B2B payments with light invoicing.' },
  { href: '/vs-quickbooks', name: 'QuickBooks', pitch: 'The default SMB invoicing and payments stack.' },
  { href: '/vs-gaviti', name: 'Gaviti', pitch: 'AI-powered invoice-to-cash for mid-market and enterprise.' },
  { href: '/vs-growfin', name: 'Growfin', pitch: 'Behavioral AI AR automation for NetSuite/ERP-first enterprises.' },
  { href: '/vs-highradius', name: 'HighRadius', pitch: 'Autonomous finance for the Office of the CFO.' },
  { href: '/vs-freshbooks', name: 'FreshBooks', pitch: 'Simple invoicing and accounting for freelancers and small agencies.' },
];

export default function ComparePage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">Compare</p>
        <h1 className="mt-3 h1">Collectly vs the AR automation landscape</h1>
        <p className="mt-5 lead">
          Most AR tools are built for finance teams at big companies, hide their pricing, or bury collections inside a broader payments platform.
          Collectly is the only AR-native tool built for small B2B service businesses at a flat, transparent price.
        </p>
      </section>

      <section className="container-page pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMPARISONS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="card hover:border-ink-300 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-ink-900">Collectly vs {c.name}</div>
                <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-brand-600 transition-colors" />
              </div>
              <p className="mt-2 text-sm text-ink-600">{c.pitch}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="card bg-brand-50/60 border-brand-200">
          <div className="flex items-start gap-3">
            <Search className="h-5 w-5 text-brand-600 mt-0.5" />
            <div>
              <div className="font-semibold text-ink-900">Looking for a competitor we haven't covered?</div>
              <p className="mt-1 text-sm text-ink-700">
                Tell us who you're evaluating and we'll add a comparison.{' '}
                <Link href="/contact" className="link">Contact us</Link> or{' '}
                <Link href="/interview" className="link">get $25 for a 15-minute interview</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-20">
        <ComparisonTable />
      </section>

      <MarketingFooter />
    </div>
  );
}
