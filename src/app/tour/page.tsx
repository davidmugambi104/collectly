import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { DunningDemo } from '@/components/marketing/dunning-demo';
import { ArrowRight, Play, Clock, Mail, Wallet, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Product tour · Collectly',
  description: 'Watch how Collectly follows up on overdue invoices, collects payments through a branded portal, and forecasts cash flow — without the awkward chase.',
};

const videos = [
  {
    title: '2-minute product overview',
    duration: '2:00',
    description: 'What Collectly is, who it is for, and the core workflow from first sync to first payment.',
    embed: null,
  },
  {
    title: 'Connect QuickBooks or Xero',
    duration: '1:30',
    description: 'How the OAuth flow works, what data we pull, and how we keep it read-only by default.',
    embed: null,
  },
  {
    title: 'AI dunning in action',
    duration: '2:30',
    description: 'See tone-aware email and SMS reminders, pause-on-reply logic, and escalation rules.',
    embed: null,
  },
  {
    title: 'Branded payment portal',
    duration: '1:45',
    description: 'What your customer sees when they click Pay Now — ACH, card, and local rails included.',
    embed: null,
  },
  {
    title: 'Cash-flow forecast',
    duration: '1:15',
    description: 'How the 4-week forecast predicts incoming cash and flags risky customers.',
    embed: null,
  },
];

function VideoPlaceholder({ title, duration }: { title: string; duration: string }) {
  return (
    <div className="aspect-video rounded-xl border-2 border-dashed border-ink-300 bg-ink-50 flex flex-col items-center justify-center text-center p-6">
      <div className="h-14 w-14 rounded-full bg-white border border-ink-200 shadow-sm flex items-center justify-center">
        <Play className="h-6 w-6 text-ink-700 fill-ink-700" />
      </div>
      <p className="mt-4 text-sm font-semibold text-ink-900">{title}</p>
      <p className="mt-1 text-xs text-ink-500 inline-flex items-center gap-1">
        <Clock className="h-3 w-3" /> {duration} · record as Loom / YouTube and paste URL
      </p>
    </div>
  );
}

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
            Start free trial <ArrowRight className="h-4 w-4" />
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

      {/* Video library */}
      <section className="container-page pb-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="h2 mb-2">Video walkthroughs</h2>
          <p className="text-ink-600 mb-8 max-w-2xl">
            Record these as short Looms or YouTube videos and paste the embed URLs. They replace the old paid-interview page and answer the questions prospects actually have.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {videos.map((v) => (
              <div key={v.title} className="card flex flex-col">
                <VideoPlaceholder title={v.title} duration={v.duration} />
                <h3 className="mt-4 font-semibold text-ink-900">{v.title}</h3>
                <p className="mt-1 text-sm text-ink-600">{v.description}</p>
              </div>
            ))}
          </div>
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
