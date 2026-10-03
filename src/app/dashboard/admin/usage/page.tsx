export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { requireAdminEmail } from '@/lib/auth-helper';
import { loadUsageReport } from '@/lib/usage-report-load';
import { formatCostUsd, type PlanPrice, type Window } from '@/lib/usage-report';
import { USAGE_KINDS } from '@/lib/usage-meter-core';

function priceLabel(p: PlanPrice): string {
  switch (p.kind) {
    case 'list': return `$${p.usd}/mo (${p.plan} list price)`;
    case 'manual': return `manual (${p.plan}, amount not recorded)`;
    case 'trial': return `trial (${p.plan}, not paying yet)`;
    case 'none': return 'no active plan';
    default: return 'unknown (no subscription row)';
  }
}

function kinds(w: Window): string {
  const parts = USAGE_KINDS.filter((k) => w.byKind[k]).map((k) => `${k.replace(/_/g, ' ')}: ${w.byKind[k]}`);
  return parts.length ? parts.join(', ') : 'none';
}

export default async function UsagePage() {
  // SECURITY: spans every organization, so it uses the same admin allowlist as /dashboard/admin/config.
  const admin = await requireAdminEmail();
  if (!admin.ok) {
    return (
      <AppShell title="Usage and cost">
        <div className="card max-w-md mx-auto text-center py-12">
          <h2 className="h3">Not authorized</h2>
          <p className="mt-2 text-sm text-ink-600">This page is for the Mugavi team only.</p>
          {admin.email && (
            <p className="mt-3 text-sm text-ink-600">
              You are signed in as <strong>{admin.email}</strong>. To see this page, add that address to <code>ADMIN_EMAILS</code> (comma separated) in the hosting environment and redeploy.
            </p>
          )}
        </div>
      </AppShell>
    );
  }

  let report;
  try {
    report = await loadUsageReport();
  } catch {
    return (
      <AppShell title="Usage and cost">
        <div className="card-primary"><p className="text-sm text-ink-600">The usage table could not be read right now. Sends are not affected.</p></div>
      </AppShell>
    );
  }
  const { orgs, totals } = report;

  return (
    <AppShell title="Usage and cost" subtitle={`${orgs.length} organizations, ${totals.flaggedCount} flagged`}>
      <div className="card-primary mb-6 text-sm text-ink-600">
        <p>
          Costs are <strong>estimates</strong> from the constants in <code>src/lib/usage-costs.ts</code>, rounded up. Fixed costs (hosting, Clerk, Vercel, the database) are not included, so real margin is lower than shown.
          Plan price is the list price for Stripe subscriptions (founding discounts and extra client books are not reflected); manual plans show no amount, so no margin is worked out for them.
          An org is flagged when its estimated cost is more than 10% of a known price.
        </p>
      </div>

      <div className="card-primary mb-6 overflow-x-auto">
        <h2 className="app-heading">Totals</h2>
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">Estimated usage cost across all organizations</caption>
          <thead><tr className="text-left text-ink-600"><th scope="col" className="py-2 pr-4 font-medium">Window</th><th scope="col" className="py-2 pr-4 font-medium">Units by kind</th><th scope="col" className="py-2 font-medium">Estimated cost</th></tr></thead>
          <tbody>
            <tr className="border-t border-ink-200/70 align-top"><td className="py-2 pr-4">Last 30 days</td><td className="py-2 pr-4">{kinds(totals.last30)}</td><td className="py-2">{formatCostUsd(totals.last30.costMicros)}</td></tr>
            <tr className="border-t border-ink-200/70 align-top"><td className="py-2 pr-4">This month</td><td className="py-2 pr-4">{kinds(totals.month)}</td><td className="py-2">{formatCostUsd(totals.month.costMicros)}</td></tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-ink-500">Known list-price revenue per month: ${totals.knownRevenueUsd}. Manual and trial plans are not counted.</p>
      </div>

      <div className="card-primary overflow-x-auto">
        <h2 className="app-heading">By organization</h2>
        {orgs.length === 0 ? (
          <p className="mt-3 text-sm text-ink-600">No usage recorded yet. Rows appear after the next real send or AI call.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Estimated usage and margin per organization</caption>
            <thead>
              <tr className="text-left text-ink-600">
                <th scope="col" className="py-2 pr-4 font-medium">Organization</th>
                <th scope="col" className="py-2 pr-4 font-medium">Plan price</th>
                <th scope="col" className="py-2 pr-4 font-medium">Last 30 days</th>
                <th scope="col" className="py-2 pr-4 font-medium">This month</th>
                <th scope="col" className="py-2 pr-4 font-medium">Est. margin (month)</th>
                <th scope="col" className="py-2 font-medium">Flag</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.orgId} className="border-t border-ink-200/70 align-top">
                  <td className="py-2 pr-4"><div className="font-medium">{o.name}</div><div className="text-xs text-ink-500">{o.orgId}</div></td>
                  <td className="py-2 pr-4">{priceLabel(o.price)}</td>
                  <td className="py-2 pr-4"><div>{formatCostUsd(o.last30.costMicros)}</div><div className="text-xs text-ink-500">{kinds(o.last30)}</div></td>
                  <td className="py-2 pr-4"><div>{formatCostUsd(o.month.costMicros)}</div><div className="text-xs text-ink-500">{kinds(o.month)}</div></td>
                  <td className="py-2 pr-4">{o.marginMonthUsd === null ? 'not known' : `$${o.marginMonthUsd.toFixed(2)}`}</td>
                  <td className="py-2">{o.flagged ? <span className="badge">Cost over 10% of price</span> : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
