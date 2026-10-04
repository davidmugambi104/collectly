export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { requireAdminEmail } from '@/lib/auth-helper';
import { loadFunnelReport } from '@/lib/funnel-report-load';
import type { WindowReport } from '@/lib/funnel-report';
import { PLAN_PRICING } from '@/lib/utils';

const pct = (r: number | null) => (r === null ? 'n/a' : `${Math.round(r * 100)}%`);
const planName = (p: string) => (p in PLAN_PRICING ? PLAN_PRICING[p as keyof typeof PLAN_PRICING].name : p);

function Window({ w }: { w: WindowReport }) {
  const max = Math.max(1, ...w.steps.map((s) => s.count));
  return (
    <section className="card-primary mb-6" aria-labelledby={`w${w.days}`}>
      <h2 className="app-heading" id={`w${w.days}`}>Last {w.days} days</h2>
      {w.signups === 0 ? (
        <p className="mt-3 text-sm text-ink-600">No events yet: no organization signed up in this window.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-500">Orgs that signed up in the window, and how many of them have ever reached each step.</p>
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Funnel for orgs that signed up in the last {w.days} days</caption>
            <thead><tr className="text-left text-ink-600">
              <th scope="col" className="py-2 pr-4 font-medium">Step</th>
              <th scope="col" className="py-2 pr-4 font-medium w-1/2">Orgs</th>
              <th scope="col" className="py-2 pr-4 font-medium">From previous step</th>
              <th scope="col" className="py-2 font-medium">Of signups</th>
            </tr></thead>
            <tbody>
              {w.steps.map((s, i) => (
                <tr key={s.key} className="border-t border-ink-200/70 align-middle">
                  <td className="py-2 pr-4">{i + 1}. {s.label}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 flex-1 rounded-r bg-ink-100" aria-hidden="true">
                        <div className="h-3 rounded-r bg-brand-600" style={{ width: `${(s.count / max) * 100}%`, minWidth: s.count > 0 ? 2 : 0 }} />
                      </div>
                      <span className="w-8 text-right tabular-nums">{s.count}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{i === 0 ? '' : pct(s.fromPrevious)}</td>
                  <td className="py-2 tabular-nums">{i === 0 ? '' : pct(s.fromSignups)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {w.signups < 30 && <p className="mt-2 text-xs text-ink-500">Under 30 signups: read these as counts, not rates.</p>}

          <div className="mt-5 grid gap-6 sm:grid-cols-2 text-sm">
            <div>
              <h3 className="font-medium">Plan mix (signups in window)</h3>
              <ul className="mt-2 space-y-1">
                {w.planMix.map((p) => <li key={p.plan} className="flex justify-between"><span>{planName(p.plan)}</span><span className="tabular-nums">{p.count}</span></li>)}
              </ul>
            </div>
            <div>
              <h3 className="font-medium">Practice books and cancels</h3>
              <ul className="mt-2 space-y-1">
                <li className="flex justify-between"><span>Orgs on a Practice plan</span><span className="tabular-nums">{w.practiceOrgs}</span></li>
                <li className="flex justify-between"><span>People with 2+ client books</span><span className="tabular-nums">{w.multiBookOwners}</span></li>
                <li className="flex justify-between"><span>Books they hold</span><span className="tabular-nums">{w.multiBookBooks}</span></li>
                <li className="flex justify-between"><span>Orgs with a cancel request (any signup date)</span><span className="tabular-nums">{w.cancelRequests}</span></li>
              </ul>
            </div>
          </div>

          <h3 className="mt-6 font-medium text-sm">Orgs stuck at a step</h3>
          {w.stuck.length === 0 ? (
            <p className="mt-2 text-sm text-ink-600">Nobody is stuck: every org in this window has reached the last step.</p>
          ) : w.stuck.map((g) => (
            <div key={g.afterStep} className="mt-3 text-sm">
              <p className="text-ink-600">Reached &ldquo;{g.afterLabel}&rdquo;, not yet &ldquo;{g.waitingFor}&rdquo;: <strong>{g.total}</strong>{g.total > g.orgs.length ? ` (showing the ${g.orgs.length} oldest)` : ''}</p>
              <ul className="mt-1 divide-y divide-ink-200/70">
                {g.orgs.map((o) => <li key={o.orgId} className="flex justify-between py-1"><span>{o.name}</span><span className="tabular-nums text-ink-500">{o.daysSinceSignup} days since signup</span></li>)}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

export default async function FunnelPage() {
  // SECURITY: spans every organization, so it uses the same admin allowlist as /dashboard/admin/config and /usage.
  const admin = await requireAdminEmail();
  if (!admin.ok) {
    return (
      <AppShell title="Funnel">
        <div className="card max-w-md mx-auto text-center py-12">
          <h2 className="h3">Not authorized</h2>
          <p className="mt-2 text-sm text-ink-600">This page is for the Mugavi team only.</p>
        </div>
      </AppShell>
    );
  }
  let data;
  try {
    data = await loadFunnelReport();
  } catch {
    return (
      <AppShell title="Funnel">
        <div className="card-primary"><p className="text-sm text-ink-600">The events table could not be read right now.</p></div>
      </AppShell>
    );
  }
  return (
    <AppShell title="Funnel" subtitle="Sign-up to first payment, from the first-party events table">
      <div className="card-primary mb-6 text-sm text-ink-600">
        <p>
          Each step counts orgs, not events, and a later step can be reached without an earlier one being recorded (for example orgs created before
          the sign-up event existed use their creation date). An approval counts as a send. &ldquo;First payment after a reminder&rdquo; covers Stripe portal
          payments only; manual mark-paid is not flagged. Org names and day counts only, no customer data.
        </p>
      </div>
      {data.eventRows === 0 && <div className="card-primary mb-6"><p className="text-sm text-ink-600">No events yet in the last 90 days, so every step below reads zero.</p></div>}
      {data.windows.map((w) => <Window key={w.days} w={w} />)}
    </AppShell>
  );
}
