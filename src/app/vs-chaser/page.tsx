import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { WaitlistForm } from '@/components/marketing/waitlist';
import { Button } from '@/components/ui/button';
import { ComparisonTable } from '@/components/marketing/comparison-table';
import Link from 'next/link';
import { Check, X, ArrowRight, DollarSign, Clock, Zap, Users } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';

export const metadata = pageMetadata({
  title: 'Collectly vs Chaser — better AR automation for small B2B services',
  description:
    'Side-by-side of Collectly and Chaser. Chaser starts around $259/mo ' +
    'with templated reminders. Collectly starts at $49/mo with tone-aware ' +
    'AI dunning, no per-invoice fees, 10-minute setup, and reply-or-pay ' +
    'pause — built for 5-30 person agencies and consultancies on Xero.',
  path: '/vs-chaser',
  image: '/og-vs-chaser.png',
  keywords: ['Collectly vs Chaser', 'Chaser alternative', 'Xero invoice reminder', 'Chaser vs Collectly'],
});

const DIFFS = [
  { icon: DollarSign, label: 'Price', collectly: '$49/mo flat, no per-invoice fees', chaser: '~$259/mo entry plan' },
  { icon: Clock, label: 'Setup', collectly: 'Under 10 minutes', chaser: 'Hours to days' },
  { icon: Zap, label: 'AI dunning', collectly: 'Tone-aware email + SMS out of the box', chaser: 'Email/SMS/call, AI email generator' },
  { icon: Users, label: 'Best for', collectly: '5-30 person agencies and consultancies', chaser: 'SMB to mid-market ($5M–$120M revenue)' },
];

export default function VsChaserPage() {
  return (
    <div className="min-h-screen">
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Compare', path: '/compare' },
          { name: 'vs Chaser', path: '/vs-chaser' },
        ]}
      />
      <MarketingHeader />

      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">Comparison</p>
        <h1 className="mt-3 h1">Collectly vs Chaser</h1>
        <p className="mt-5 lead">
          Chaser is a solid receivables tool — but it's priced for bigger businesses and starts at ~$259/mo.
          Collectly gives small B2B service businesses the same AR automation at a flat $49/mo, with no per-invoice fees
          and a 10-minute setup.
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
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Chaser</div>
                <div className="text-sm text-ink-600">{d.chaser}</div>
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
          <h2 className="h2 text-center">How Chaser built its clientele</h2>
          <p className="mt-4 text-center text-ink-600">Chaser grew by being one of the first SMB-focused receivables tools out of the UK, then expanding globally.</p>
          <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm text-ink-700">
            <div className="card">
              <div className="font-semibold text-ink-900">Content + education</div>
              <p className="mt-1">Heavy blog and "accounts receivable insights" hub drives organic traffic from finance teams searching AR best practices.</p>
            </div>
            <div className="card">
              <div className="font-semibold text-ink-900">Revenue-tiered pricing</div>
              <p className="mt-1">Plans priced by annual revenue band made it easy for growing SMBs to self-select and upgrade naturally.</p>
            </div>
            <div className="card">
              <div className="font-semibold text-ink-900">"Chaser Pay" wedge</div>
              <p className="mt-1">Embedded payment acceptance gives customers a reason to bring invoices into Chaser even before full automation.</p>
            </div>
            <div className="card">
              <div className="font-semibold text-ink-900">Services add-on (Care)</div>
              <p className="mt-1">Optional outsourced AR specialists create stickiness and let smaller teams delegate collections entirely.</p>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-ink-600">
            <strong>For Collectly:</strong> Chaser proved the SMB AR market is willing to pay — but also that $259/mo is too high for the long tail. Collectly can win the same buyers at $49/mo without the heavy services overhead.
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
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You're a 5-30 person agency or consultancy</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You want transparent, flat pricing</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You use Xero (QuickBooks in beta)</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />You want empathetic, tone-aware follow-up</li>
              </ul>
            </div>
            <div className="card">
              <div className="text-sm font-semibold text-ink-700 mb-2">Choose Chaser if...</div>
              <ul className="space-y-2 text-sm text-ink-700">
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />You're mid-market ($5M+ revenue)</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />You need multi-entity or complex forecasting</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />You want outsourced AR services (Care add-on)</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />You need phone/letter dunning channels</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="card-lg grad-mesh text-center">
          <h2 className="h2">Stop overpaying for AR automation</h2>
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
