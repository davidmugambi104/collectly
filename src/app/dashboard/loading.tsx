import { AppShell } from '@/components/app/shell';

/**
 * Navigation skeleton.
 *
 * Two things were wrong with the previous version and both are felt on every
 * single navigation, which makes this file punch above its size.
 *
 * It pulsed. A placeholder that fades in and out reads as a broken element —
 * the eye interprets opacity cycling as "this is failing", not "this is
 * loading". A travelling highlight (`.skel`, defined in globals.css) reads as
 * work in progress instead.
 *
 * And its shape did not match the page it stood in for: a 4-up tile row where
 * the overview renders 5, and a two-column split with the wrong proportions.
 * So content landing caused a visible reflow — the layout jumping is what
 * makes an app feel cheap even when the load itself was fast. The grid below
 * mirrors src/app/dashboard/page.tsx exactly: 5 stat tiles, then a 2/3 + 1/3
 * split, at the same gaps.
 */
export default function Loading() {
  return (
    <AppShell title="Loading…" subtitle="One moment">
      <div>
        {/* 5-up, matching DashboardKpiGrid — not 4. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-tile flex flex-col">
              <div className="flex min-h-[2.25rem] items-start justify-between gap-2">
                <div className="skel h-2.5 w-20" />
                <div className="skel h-4 w-4 rounded" />
              </div>
              <div className="skel mt-2 h-7 w-28" />
              <div className="skel mt-2 h-2 w-24" />
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* Stands in for the AI insights panel, which is card-primary. */}
            <div className="card-primary">
              <div className="flex items-center gap-2.5">
                <div className="skel h-7 w-7 rounded-md" />
                <div className="min-w-0 flex-1">
                  <div className="skel h-3 w-24" />
                  <div className="skel mt-1.5 h-2 w-48" />
                </div>
              </div>
              <div className="mt-4 divide-y divide-ink-100">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-3 py-3">
                    <div className="skel h-8 w-8 rounded-md" />
                    <div className="min-w-0 flex-1">
                      <div className="skel h-2.5 w-16" />
                      <div className="skel mt-2 h-3 w-2/3" />
                      <div className="skel mt-2 h-2 w-full max-w-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* A/R aging: heading, the stacked bar, then its legend rows. */}
            <div className="card">
              <div className="skel h-3 w-24" />
              <div className="skel mt-2 h-2 w-56" />
              <div className="skel mt-4 h-3 w-full rounded-full" />
              <div className="mt-4 space-y-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1.5">
                    <div className="skel h-2 w-2 rounded-full" />
                    <div className="skel h-2.5 flex-1 max-w-[7rem]" />
                    <div className="skel ml-auto h-2.5 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* The right rail is chrome-free in the real page, so its skeleton
              must be too — a bordered card here would promise a box that
              never arrives. */}
          <div className="space-y-6">
            <div>
              <div className="skel mb-3 h-3 w-32" />
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-[10px] border border-[color:var(--hair)] bg-white px-3 py-2.5">
                    <div className="skel h-8 w-8 rounded-md" />
                    <div className="min-w-0 flex-1">
                      <div className="skel h-2.5 w-32" />
                      <div className="skel mt-1.5 h-2 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="skel mb-3 h-3 w-36" />
              <div className="space-y-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2">
                    <div className="skel h-9 w-9 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <div className="skel h-2.5 w-28" />
                      <div className="skel mt-1.5 h-2 w-20" />
                    </div>
                    <div className="skel h-2.5 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
