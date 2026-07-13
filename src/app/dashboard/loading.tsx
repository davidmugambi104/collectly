import { AppShell } from '@/components/app/shell';

export default function Loading() {
  return (
    <AppShell title="Loading…" subtitle="One moment">
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="h-3 w-20 rounded bg-ink-200 animate-pulse" />
              <div className="mt-3 h-7 w-32 rounded bg-ink-200 animate-pulse" />
              <div className="mt-2 h-2 w-24 rounded bg-ink-100 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 card">
            <div className="h-5 w-32 rounded bg-ink-200 animate-pulse" />
            <div className="mt-4 space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 rounded bg-ink-100 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="card">
            <div className="h-5 w-32 rounded bg-ink-200 animate-pulse" />
            <div className="mt-4 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-ink-100 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
