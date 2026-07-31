import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { DunningDemo } from '@/components/marketing/dunning-demo';
import { ArrowRight, Mail, Wallet, BarChart3, Clock } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Product tour · Collectly',
  description: 'Watch how Collectly follows up on overdue invoices, collects payments through a branded portal, and forecasts cash flow — without the awkward chase.',
};

export default function TourPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="container-page pt-16 pb-12 max-w-3xl text-center">
        <p className="eyebrow">Product tour</p>
        <h1 className="mt-3 h1">See exactly how Collectly works — no sales call required.</h1>
        <p className="mt-5 lead">
          Short videos, a live demo you can try in your browser, and the honest truth about what is ready today.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/sign-up" className="btn-primary">
            Start founding trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/ar-audit" className="btn-ghost">
            Get a free A/R audit
          </Link>
        </div>
      </section>

      {/* Live interactive demo */}
      <section className="container-page pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 grid place-items-center">
              <Mail className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="h3">Try the AI dunning engine now</h2>
              <p className="text-sm text-ink-600">No signup. Pick a tone and see what we send your customer.</p>
            </div>
          </div>
          <DunningDemo />
        </div>
      </section>

      {/* Live walkthrough CTA — product videos are recorded on request and
          there's no scheduling tool wired up yet, so the honest move is a
          direct mailto that actually reaches the founder, not a dead link
          to a contact page with no booking calendar. */}
      <section className="container-page pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="h2 mb-4">See Collectly in action</h2>
          <p className="text-ink-600 mb-8">
            Product videos are being recorded. For now, email the founder directly and we'll find a time —
            we'll show you exactly how Collectly works for your business and answer your questions.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:hello@getcollectly.app?subject=Founder%20walkthrough%20request&body=Hi%20Davie%2C%0A%0AI'd%20like%20to%20book%20a%20founder%20walkthrough.%20Here's%20a%20good%20time%20for%20me%3A%0A%0A"
              className="btn-primary"
            >
              Request a founder walkthrough
            </a>
            <Link href="/sign-up" className="btn-ghost">
              Start founding trial
            </Link>
          </div>
          <p className="mt-6 text-xs text-ink-500">
            Videos coming soon: 2-min overview, QBO/Xero connection, AI dunning demo, payment portal walkthrough, cash-flow forecast.
          </p>
        </div>
      </section>

      {/* Quick feature strip */}
      <section className="border-y border-ink-200 bg-ink-50">
        <div className="container-page py-14 max-w-5xl">
          <h2 className="h3 mb-6 text-center">What you will see in the videos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Mail, label: 'Tone-aware dunning', desc: 'Friendly → firm → final, automatically.' },
              { icon: Wallet, label: 'Branded payment portal', desc: 'Customers pay without calling you.' },
              { icon: BarChart3, label: '4-week cash forecast', desc: 'Know if you can make payroll.' },
              { icon: Clock, label: '10-minute setup', desc: 'Connect QBO/Xero and go.' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-xl border border-ink-200 bg-white p-4">
                <Icon className="h-5 w-5 text-brand-600 mb-2" />
                <div className="text-sm font-semibold text-ink-900">{label}</div>
                <p className="mt-1 text-xs text-ink-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
