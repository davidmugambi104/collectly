/**
 * Pure rules for a broken QuickBooks/Xero connection: no database, no network,
 * relative imports only so node --test can load it (same convention as
 * qbo-sync-rules.ts and adapter.ts). The database-touching wrappers
 * (brokenAccountingConnections, recordSyncSummary) live in
 * connection-health-db.ts, which this file is never allowed to import.
 */

export type AccountingProvider = 'quickbooks' | 'xero';

export type BrokenConnection = {
  provider: AccountingProvider;
  label: string;
  /** Where the browser goes to fix it: the same OAuth-start route used for a first connect. */
  reconnectHref: string;
};

const LABEL: Record<AccountingProvider, string> = { quickbooks: 'QuickBooks', xero: 'Xero' };

export function reconnectHrefFor(provider: AccountingProvider, orgId: string): string {
  return provider === 'quickbooks'
    ? `/api/quickbooks/connect?orgId=${encodeURIComponent(orgId)}`
    : `/api/xero/connect?orgId=${encodeURIComponent(orgId)}`;
}

/**
 * Which of this org's accounting rows (if any) are in `status: 'error'`.
 * A connection in this state cannot refresh invoices or detect payments:
 * anything already imported from it may be stale (paid, voided or changed at
 * the source since the last successful sync). Square, Plaid and the other
 * adapters are deliberately out of scope -- this gate is for the two
 * providers the dunning scheduler and the sync route treat as the source of
 * truth for A/R.
 */
export function pickBroken(
  orgId: string,
  rows: Array<{ provider: string; status: string }>,
): BrokenConnection[] {
  return rows
    .filter((r) => (r.provider === 'quickbooks' || r.provider === 'xero') && r.status === 'error')
    .map((r) => ({ provider: r.provider as AccountingProvider, label: LABEL[r.provider as AccountingProvider], reconnectHref: reconnectHrefFor(r.provider as AccountingProvider, orgId) }));
}

export type SyncSummary = {
  at: string; // ISO timestamp
  ok: boolean;
  customersUpserted?: number;
  invoicesUpserted?: number;
  invoicesMarkedPaid?: number;
  truncated?: boolean;
  /** First few errors only -- the card shows a preview, not a full dump. */
  errors: string[];
  /** Set when the failure means the whole sync did not run at all (not a partial/row-level error). */
  failureMessage?: string;
};
