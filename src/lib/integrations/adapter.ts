/**
 * Provider adapter contract and the one shared sync.
 *
 * A new accounting provider (FreshBooks, Zoho Books, Sage, Wave, ...) supplies ONLY:
 *   - its API calls, as paged list functions that return the normalised shapes below;
 *   - its OAuth connect URL, disconnect, and `configured()` (are the env keys set).
 * Everything else is shared and lives here, applied by runSync():
 *   - paging (paging.ts fetchAllPages, with a hard page cap and a `truncated` flag);
 *   - status rules (sync-status.ts: amounts decide, voided/deleted close the invoice, an owner's
 *     dispute or write-off survives while the invoice is still open at the source);
 *   - paidAt is stamped once, on the unpaid to paid transition, never overwritten;
 *   - credits are replaced only when read in full (credits.ts / dunning/credit.ts);
 *   - every external id is stored with the provider prefix ("freshbooks:123"), so the purge in
 *     imported-data.ts removes only that provider's rows and never hand-typed ones.
 *
 * This file imports only relative .ts modules so it runs under `node --test`. The database side is a
 * SyncStore; the default one (adapter-store.ts) is loaded lazily, tests pass a fake.
 * The existing Xero and QuickBooks sync code is NOT routed through here; leave it alone.
 */
import { randomBytes } from 'node:crypto';
import { fetchAllPages } from './paging.ts';
import { reconcileStatus, statusFromAmounts, needsLookup, type LocalStatus, type SyncedStatus } from './sync-status.ts';
import { externalIdFor, PROVIDER_ID_PATTERN, type PrefixedProvider } from './imported-data.ts';
import { groupCredits, type FoundCredit } from '../dunning/credit.ts';

export type ProviderId = PrefixedProvider;

/** A customer as the provider returns it. `id` is the provider's own id, WITHOUT our prefix. */
export type AdapterCustomer = { id: string; name: string; email?: string | null; phone?: string | null; company?: string | null };

/** What the provider says about the invoice. 'open' is the default when the provider has no such field. */
export type AdapterInvoiceState = 'open' | 'paid' | 'draft' | 'voided' | 'deleted';

/** An invoice as the provider returns it. Ids are the provider's own, WITHOUT our prefix. */
export type AdapterInvoice = {
  id: string;
  /** Invoice number shown to the customer. Falls back to `id` when empty. */
  number: string;
  customerId: string;
  /** Used only to name a stub when the customer is not in the customer list. */
  customerName?: string | null;
  total: number;
  /** Amount still owed. 0 means paid. */
  balance: number;
  /** ISO 4217, upper case. */
  currency: string;
  issueDate: Date;
  dueDate: Date;
  state?: AdapterInvoiceState;
};

/** Unapplied credit (credit note, credit memo, unallocated payment). Customer id WITHOUT prefix. */
export type AdapterCredit = { customerId: string; currency: string; amount: number };

export interface ProviderAdapter {
  /** Matches the integration_provider enum value and the registry entry. */
  id: ProviderId;
  /** Shown to the owner, e.g. "FreshBooks". */
  label: string;
  /** True when every required env var is set. Never throws, never returns a value. */
  configured(): boolean;
  /** Where the browser goes to start OAuth. Must be a route you built (e.g. /api/freshbooks/connect?orgId=...). */
  connectUrl(orgId: string): string;
  /** 1-based page number. Return fewer than `pageSize` items on the last page. Throw on API failure. */
  listCustomers(orgId: string, page: number): Promise<AdapterCustomer[]>;
  /** OPEN invoices only (balance > 0), 1-based pages. */
  listOpenInvoices(orgId: string, page: number): Promise<AdapterInvoice[]>;
  /** Unapplied credit, 1-based pages. Return [] if the provider has no such concept. */
  listCredits(orgId: string, page: number): Promise<AdapterCredit[]>;
  /** Revoke at the provider (best effort) and delete the integration row. Idempotent. */
  disconnect(orgId: string): Promise<void>;
  /** Items per page the list functions return when full. Default 100. */
  pageSize?: number;
  /** Safety cap on pages per list. Default 50. */
  maxPages?: number;
  /**
   * Optional: look up one invoice we hold as open that the open list no longer returned (it was paid, voided or
   * deleted at the source). Return 'not_found' only on a clear "does not exist"; throw on any other failure.
   */
  getInvoice?(orgId: string, id: string): Promise<AdapterInvoice | 'not_found'>;
  /** Set false for file imports: rows missing from a file say nothing about the rest. Default true. */
  reconcileMissing?: boolean;
  /** Set false when the provider has no credit concept (skips listCredits). Default true. */
  supportsCredits?: boolean;
  /** Import invoices that are already paid, voided or draft when we have no local row. Default false (nothing to chase). */
  importClosed?: boolean;
}

/** The SQL purge pattern for an adapter's external ids. Always the prefix; one source of truth in imported-data.ts. */
export function adapterIdPattern(adapter: Pick<ProviderAdapter, 'id'>): string {
  return PROVIDER_ID_PATTERN[adapter.id];
}

/* ------------------------------- the store ------------------------------- */

export type ExistingCustomer = { id: string; name: string; email: string | null; phone: string | null; company: string | null };
export type ExistingInvoice = {
  id: string; customerId: string; number: string; status: string; amount: string; amountPaid: string; currency: string;
  issueDate: Date; dueDate: Date; paidAt: Date | null;
};
export type NewCustomerRow = { id: string; externalId: string; name: string; email: string | null; phone: string | null; company: string | null };
export type NewInvoiceRow = {
  id: string; customerId: string; externalId: string; number: string; status: LocalStatus; amount: string; amountPaid: string;
  currency: string; issueDate: Date; dueDate: Date; paidAt: Date | null;
};
export type InvoiceChange = Partial<Omit<NewInvoiceRow, 'id' | 'customerId' | 'externalId'>>;

export interface SyncStore {
  /** Everything this org already holds whose external id carries the provider's prefix. Keyed by the prefixed external id. */
  loadExisting(orgId: string, provider: ProviderId): Promise<{ customers: Map<string, ExistingCustomer>; invoices: Map<string, ExistingInvoice & { externalId: string }> }>;
  insertCustomers(orgId: string, rows: NewCustomerRow[]): Promise<void>;
  updateCustomer(id: string, set: { name?: string; email?: string | null; phone?: string | null; company?: string | null }): Promise<void>;
  insertInvoices(orgId: string, rows: NewInvoiceRow[]): Promise<void>;
  updateInvoice(id: string, set: InvoiceChange): Promise<void>;
  /** Timeline note when an invoice is closed at the source. */
  recordClosed(orgId: string, row: { invoiceId: string; customerId: string; number: string; closure: 'voided' | 'deleted'; providerLabel: string }): Promise<void>;
  /** Replaces ALL of the org's credit rows. Only called with a full read. */
  replaceCredits(orgId: string, found: FoundCredit[]): Promise<number>;
  touchLastSync(orgId: string, provider: ProviderId): Promise<void>;
}

/* -------------------------------- the sync -------------------------------- */

export type SyncResult = {
  customersUpserted: number;
  invoicesUpserted: number;
  invoicesCreated: number;
  invoicesUpdated: number;
  invoicesMarkedPaid: number;
  invoicesClosed: number;
  /** Already paid, voided or draft at the source with no local row: not imported, nothing to chase. */
  invoicesSkippedClosed: number;
  durationMs: number;
  errors: string[];
  truncated: boolean;
};

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 50;
const RECONCILE_CAP = 300;
const CHUNK = 500;

const newId = (): string => randomBytes(12).toString('base64url');
const cents = (n: number): string => (Math.round(n * 100) / 100).toFixed(2);
const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function* chunks<T>(items: T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}

/** The status a provider invoice gets, from the shared rules. Null means "closed at the source". */
export function syncedStatusFor(inv: AdapterInvoice, now: Date): { status: SyncedStatus; closure: 'voided' | 'deleted' | null } {
  if (inv.state === 'voided' || inv.state === 'deleted') return { status: 'written_off', closure: inv.state };
  if (inv.state === 'draft') return { status: 'draft', closure: null };
  const due = inv.state === 'paid' ? 0 : Math.max(0, inv.balance);
  return { status: statusFromAmounts({ total: inv.total, due, dueDate: inv.dueDate, now }), closure: null };
}

/** How much of the invoice is paid. */
function paidOf(inv: AdapterInvoice, status: SyncedStatus): number {
  return status === 'paid' ? inv.total : Math.max(0, inv.total - Math.max(0, inv.balance));
}

export async function runSync(adapter: ProviderAdapter, orgId: string, storeIn?: SyncStore, now: Date = new Date()): Promise<SyncResult> {
  const store = storeIn ?? (await import('./adapter-store')).dbSyncStore;
  const t0 = Date.now();
  const errors: string[] = [];
  const pageSize = adapter.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = adapter.maxPages ?? DEFAULT_MAX_PAGES;
  const prefixed = (rawId: string): string => externalIdFor(adapter.id, rawId);
  const r: SyncResult = {
    customersUpserted: 0, invoicesUpserted: 0, invoicesCreated: 0, invoicesUpdated: 0, invoicesMarkedPaid: 0,
    invoicesClosed: 0, invoicesSkippedClosed: 0, durationMs: 0, errors, truncated: false,
  };

  // 1. Read. A failed customer or invoice read is reported with the prefixes the sync route already looks for.
  let customers: AdapterCustomer[] = [];
  try {
    const got = await fetchAllPages((p) => adapter.listCustomers(orgId, p), pageSize, maxPages);
    customers = got.items;
    if (got.truncated) r.truncated = true;
  } catch (e) { errors.push(`customers: ${errText(e)}`); }

  let invoices: AdapterInvoice[] = [];
  let invoicesRead = false;
  try {
    const got = await fetchAllPages((p) => adapter.listOpenInvoices(orgId, p), pageSize, maxPages);
    invoices = got.items;
    invoicesRead = true;
    if (got.truncated) r.truncated = true;
  } catch (e) { errors.push(`invoices: ${errText(e)}`); }

  const existing = await store.loadExisting(orgId, adapter.id);
  const customerIdByExt = new Map<string, string>([...existing.customers].map(([ext, c]) => [ext, c.id]));

  // 2. Customers: update what changed, queue the new ones. An empty value never blanks a stored email or phone.
  const newCustomers: NewCustomerRow[] = [];
  const seenCustomers = new Set<string>();
  for (const c of customers) {
    try {
      const ext = prefixed(String(c.id));
      if (!c.id || seenCustomers.has(ext)) continue;
      seenCustomers.add(ext);
      const name = (c.name ?? '').trim() || `${adapter.label} customer ${c.id}`;
      const email = c.email?.trim() || null;
      const phone = c.phone?.trim() || null;
      const company = c.company?.trim() || null;
      const have = existing.customers.get(ext);
      if (have) {
        const set: { name?: string; email?: string | null; phone?: string | null; company?: string | null } = {};
        if (name !== have.name) set.name = name;
        if (email && email !== have.email) set.email = email;
        if (phone && phone !== have.phone) set.phone = phone;
        if (company && company !== have.company) set.company = company;
        if (Object.keys(set).length) await store.updateCustomer(have.id, set);
      } else {
        const id = newId();
        newCustomers.push({ id, externalId: ext, name, email, phone, company });
        customerIdByExt.set(ext, id);
      }
      r.customersUpserted++;
    } catch (e) { errors.push(`customer ${c?.id}: ${errText(e)}`); }
  }

  // 3. Invoices.
  const newInvoices: NewInvoiceRow[] = [];
  const queued = new Set<string>();
  const applyInvoice = async (inv: AdapterInvoice): Promise<void> => {
    try {
      const ext = prefixed(String(inv.id));
      if (!inv.id || queued.has(ext)) return;
      const { status: syncedStatus, closure } = syncedStatusFor(inv, now);
      const have = existing.invoices.get(ext);
      if (!have) {
        if (closure) { r.invoicesSkippedClosed++; return; }
        if (!adapter.importClosed && (syncedStatus === 'paid' || syncedStatus === 'draft')) { r.invoicesSkippedClosed++; return; }
        if (!inv.customerId) { errors.push(`invoice ${inv.id}: no customer`); return; }
        const custExt = prefixed(String(inv.customerId));
        let customerId = customerIdByExt.get(custExt);
        if (!customerId) {
          // Customer missing from the list (deleted, or a partial read): a stub keeps the invoice attached.
          customerId = newId();
          newCustomers.push({ id: customerId, externalId: custExt, name: inv.customerName?.trim() || `${adapter.label} customer ${inv.customerId}`, email: null, phone: null, company: null });
          customerIdByExt.set(custExt, customerId);
          r.customersUpserted++;
        }
        queued.add(ext);
        newInvoices.push({
          id: newId(), customerId, externalId: ext, number: inv.number?.trim() || String(inv.id), status: syncedStatus,
          amount: cents(inv.total), amountPaid: cents(paidOf(inv, syncedStatus)),
          currency: (inv.currency || 'USD').toUpperCase().slice(0, 3), issueDate: inv.issueDate, dueDate: inv.dueDate,
          paidAt: syncedStatus === 'paid' ? now : null,
        });
        r.invoicesCreated++;
        r.invoicesUpserted++;
        return;
      }
      queued.add(ext);
      if (closure) {
        if (have.status !== 'written_off') {
          await store.updateInvoice(have.id, { status: 'written_off' });
          await store.recordClosed(orgId, { invoiceId: have.id, customerId: have.customerId, number: have.number, closure, providerLabel: adapter.label });
          r.invoicesClosed++;
        }
        return;
      }
      const status = reconcileStatus(have.status, syncedStatus);
      const next = {
        number: inv.number?.trim() || String(inv.id),
        amount: cents(inv.total), amountPaid: cents(paidOf(inv, syncedStatus)),
        currency: (inv.currency || 'USD').toUpperCase().slice(0, 3),
        issueDate: inv.issueDate, dueDate: inv.dueDate, status,
      };
      const changed =
        next.number !== have.number || next.amount !== Number(have.amount).toFixed(2) || next.amountPaid !== Number(have.amountPaid).toFixed(2) ||
        next.currency !== have.currency || next.issueDate.getTime() !== new Date(have.issueDate).getTime() ||
        next.dueDate.getTime() !== new Date(have.dueDate).getTime() || next.status !== have.status;
      const wasUnpaid = have.status !== 'paid';
      if (changed) {
        // paidAt records WHEN it was paid: stamped on the unpaid to paid move only, kept afterwards, cleared if it reopens.
        const paidAt = status === 'paid' ? (have.paidAt ?? now) : null;
        await store.updateInvoice(have.id, { ...next, paidAt });
        r.invoicesUpdated++;
        if (wasUnpaid && status === 'paid') r.invoicesMarkedPaid++;
      }
      r.invoicesUpserted++;
    } catch (e) { errors.push(`invoice ${inv?.id}: ${errText(e)}`); }
  };

  for (const inv of invoices) await applyInvoice(inv);

  // 4. Invoices we hold as open that the open list did not return were closed at the source. Ask by id; a clear
  // "not found" closes, any other failure leaves the invoice open and is reported. Never runs after a failed read.
  if (invoicesRead && adapter.reconcileMissing !== false && adapter.getInvoice && !r.truncated) {
    try {
      const seen = new Set(invoices.map((i) => prefixed(String(i.id))));
      const missing = [...existing.invoices.values()].filter((h) => needsLookup(h.status) && !seen.has(h.externalId));
      if (missing.length > RECONCILE_CAP) errors.push(`reconcile: ${missing.length} open invoices were not in the list; checked the first ${RECONCILE_CAP}`);
      for (const h of missing.slice(0, RECONCILE_CAP)) {
        try {
          const raw = h.externalId.slice(adapter.id.length + 1);
          const got = await adapter.getInvoice(orgId, raw);
          if (got === 'not_found') await applyInvoice({ id: raw, number: h.number, customerId: '', total: 0, balance: 0, currency: h.currency, issueDate: h.issueDate, dueDate: h.dueDate, state: 'deleted' });
          else await applyInvoice(got);
        } catch (e) { errors.push(`reconcile invoice ${h.externalId}: ${errText(e)}`); }
      }
    } catch (e) { errors.push(`reconcile: ${errText(e)}`); }
  } else if (!invoicesRead) {
    errors.push('invoices were not read, so nothing was closed or marked paid this time');
  }

  // 5. Write new rows. Customers first: invoices point at them.
  for (const part of chunks(newCustomers, CHUNK)) {
    try { await store.insertCustomers(orgId, part); } catch (e) { errors.push(`customers: could not save ${part.length}: ${errText(e)}`); }
  }
  for (const part of chunks(newInvoices, CHUNK)) {
    try { await store.insertInvoices(orgId, part); } catch (e) { errors.push(`invoices: could not save ${part.length}: ${errText(e)}`); r.invoicesCreated -= part.length; r.invoicesUpserted -= part.length; }
  }

  // 6. Credits: stored only when read in full, so a failed or cut-off read never wipes real credit.
  if (adapter.supportsCredits !== false) {
    try {
      const got = await fetchAllPages((p) => adapter.listCredits(orgId, p), pageSize, maxPages);
      if (got.truncated) errors.push('credit: too many to read in one sync, so credit was left as it was');
      else await store.replaceCredits(orgId, groupCredits(got.items.map((c) => ({ customerExternalId: prefixed(String(c.customerId)), currency: c.currency, amount: c.amount }))));
    } catch (e) { errors.push(`credit: ${errText(e)}`); }
  }

  await store.touchLastSync(orgId, adapter.id);
  if (r.truncated) errors.push(`sync stopped at its limit (${maxPages} pages of ${pageSize}), so some customers or invoices may not have been imported`);
  r.durationMs = Date.now() - t0;
  return r;
}
