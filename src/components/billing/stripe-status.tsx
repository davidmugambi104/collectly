import type { StripeBillingStatus } from '@/lib/stripe-billing-config';

const TONE = {
  not_configured: 'badge-danger',
  test: 'badge-warn',
  live: 'badge-success',
} as const;

/** Status of Mugavi's own Stripe billing. Names only, never a value. `showVars` lists the env var names. */
export function StripeStatus({ status, showVars }: { status: StripeBillingStatus; showVars: boolean }) {
  return (
    <div role="status" className="rounded-[10px] border border-ink-200 bg-white p-4 text-[13px] lift-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className={TONE[status.mode]}>{status.label}</span>
        {status.mode !== 'not_configured' && !status.checkoutReady && <span className="text-ink-600">Checkout stays off until every setting below is present.</span>}
        {status.checkoutReady && status.mode === 'test' && <span className="text-ink-600">Test keys only: no real money moves.</span>}
        {status.checkoutReady && status.mode === 'live' && <span className="text-ink-600">Card and bank checkout is on. Stripe Tax is {status.automaticTax ? 'on' : 'off'}.</span>}
      </div>
      {showVars && (
        <div className="mt-3">
          <div className="font-medium text-ink-900">Environment variables needed (names only)</div>
          <ul className="mt-1 grid gap-x-6 sm:grid-cols-2">
            {status.required.map((n) => (
              <li key={n} className="font-mono text-xs">
                {n} {status.missing.includes(n) ? <span className="text-danger-900">missing</span> : <span className="text-success-700">set</span>}
              </li>
            ))}
          </ul>
          <div className="mt-2 text-ink-600">
            Optional: {status.optional.map((o) => <span key={o.name} className="mr-3 font-mono text-xs">{o.name} ({o.set ? 'set' : 'not set'})</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
