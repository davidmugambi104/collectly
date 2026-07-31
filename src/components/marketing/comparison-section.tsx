import { ComparisonTable } from '@/components/marketing/comparison-table';
import { WaitlistForm } from '@/components/marketing/waitlist';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Check, LucideIcon } from 'lucide-react';

export type DiffCard = { icon: LucideIcon; label: string; collectly: string; competitor: string };
export type StrategyCard = { title: string; body: string };
export type PickReason = { label: string };

export function ComparisonHero({
  title,
  subtitle,
  competitorName,
  ctaHref = '/sign-up',
}: {
  title: string;
  subtitle: string;
  competitorName: string;
  ctaHref?: string;
}) {
  return (
    <section className="container-page pt-16 pb-12 max-w-3xl">
      <p className="eyebrow">Comparison</p>
      <h1 className="mt-3 h1">{title}</h1>
      <p className="mt-5 lead">{subtitle}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={ctaHref}>
          <Button className="gap-1.5">
            Start founding trial <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/pricing">
          <Button variant="secondary">See pricing</Button>
        </Link>
      </div>
    </section>
  );
}

export function ComparisonDiffGrid({ diffs, competitorName }: { diffs: DiffCard[]; competitorName: string }) {
  return (
    <section className="container-page pb-16">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {diffs.map((d) => (
          <div key={d.label} className="card">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <d.icon className="h-4 w-4 text-brand-600" /> {d.label}
            </div>
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Collectly</div>
              <div className="text-sm text-ink-900">{d.collectly}</div>
            </div>
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">{competitorName}</div>
              <div className="text-sm text-ink-600">{d.competitor}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ComparisonFullTable() {
  return (
    <section className="container-page pb-20">
      <ComparisonTable />
    </section>
  );
}

export function CompetitorGrowthStrategy({
  competitorName,
  summary,
  cards,
  takeaway,
}: {
  competitorName: string;
  summary: string;
  cards: StrategyCard[];
  takeaway: string;
}) {
  return (
    <section className="bg-ink-50 border-y border-ink-200">
      <div className="container-page py-16 max-w-3xl">
        <h2 className="h2 text-center">How {competitorName} built its clientele</h2>
        <p className="mt-4 text-center text-ink-600">{summary}</p>
        <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm text-ink-700">
          {cards.map((c) => (
            <div key={c.title} className="card">
              <div className="font-semibold text-ink-900">{c.title}</div>
              <p className="mt-1">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center text-sm text-ink-600">
          <strong>For Collectly:</strong> {takeaway}
        </div>
      </div>
    </section>
  );
}

export function WhenToChoose({
  competitorName,
  chooseCollectly,
  chooseCompetitor,
}: {
  competitorName: string;
  chooseCollectly: PickReason[];
  chooseCompetitor: PickReason[];
}) {
  return (
    <section className="bg-ink-50 border-y border-ink-200">
      <div className="container-page py-16 max-w-3xl">
        <h2 className="h2 text-center">When to choose which</h2>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="card">
            <div className="text-sm font-semibold text-emerald-700 mb-2">Choose Collectly if...</div>
            <ul className="space-y-2 text-sm text-ink-700">
              {chooseCollectly.map((r) => (
                <li key={r.label} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <div className="text-sm font-semibold text-ink-700 mb-2">Choose {competitorName} if...</div>
            <ul className="space-y-2 text-sm text-ink-700">
              {chooseCompetitor.map((r) => (
                <li key={r.label} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-ink-500 mt-0.5 flex-shrink-0" />
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ComparisonCta({ headline, body }: { headline: string; body: string }) {
  return (
    <section className="container-page py-20">
      <div className="card-lg grad-mesh text-center">
        <h2 className="h2">{headline}</h2>
        <p className="mt-4 lead">{body}</p>
        <div className="mt-6 max-w-md mx-auto">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
