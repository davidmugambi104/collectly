import { withMinorVersion } from './qbo-minor-version';
/**
 * QuickBooks Online integration — OAuth, token refresh, customer/invoice
 * sync, and payment pushback.
 *
 * Docs: https://developer.intuit.com/app/developer/qbo/docs/develop
 *
 * Token model:
 *  - Access token expires in 1h (3600s).
 *  - Refresh token expires in 100 days but is rotated on every refresh.
 *  - We auto-refresh transparently before any API call when within 5 min
 *    of expiry, so callers can treat tokens as always-valid.
 */
import { db } from '@/db';
import { ensureIntegrationProviderSchema } from '@/lib/integrations/provider-enum';
import { integrations, customers as customersTbl, invoices as invoicesTbl, organizations, timelineEvents } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { fetchAllPages, chunk } from '@/lib/integrations/paging';
import { needsLookup, reconcileStatus, qboSyncedStatus } from '@/lib/integrations/sync-status';
import { qboClosure, isQboNotFound, resolveHomeCurrency } from '@/lib/integrations/qbo-sync-rules';
import { nanoid, errorMessage } from '@/lib/utils';
import { replaceCredits } from '@/lib/integrations/credits';

/* Intuit ships no types package for the QBO REST surface. These describe only
   the fields this module reads — narrower than `any`, and an upstream rename
   becomes a compile error instead of a silent undefined written to the DB. */
type QboTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in?: number;
  x_refresh_token_expires_in?: number;
};
type QboCustomer = {
  Id: string;
  DisplayName?: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address?: string };
  PrimaryPhone?: { FreeFormNumber?: string };
};
type QboInvoice = {
  Id: string;
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  TotalAmt?: number;
  Balance?: number;
  CurrencyRef?: { value?: string };
  CustomerRef?: { value?: string; name?: string };
  /** QuickBooks writes "Voided" here when an invoice is voided. */
  PrivateNote?: string;
  /** Only change-data payloads carry this ("Deleted"). */
  status?: string;
};
type QboQuery<K extends string, T> = { QueryResponse?: Partial<Record<K, T[]>> };


const QBO_BASE = (process.env.NODE_ENV !== 'production' && process.env.QBO_API_BASE) // tests point this at a local stand-in; never honoured in production
  || (process.env.QBO_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com');

const QBO_OAUTH = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const QBO_REVOKE = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';

// Refresh the access token if it's within 5 min of expiry (or already past).
// Persists the new tokens. Returns the (possibly new) integration row.
async function getFreshQboToken(orgId: string, force = false) {
  const [integ] = await db.select().from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'quickbooks'))).limit(1);
  if (!integ) throw new Error('QuickBooks not connected');

  const now = Date.now();
  const expiresAt = integ.expiresAt ? new Date(integ.expiresAt).getTime() : 0;
  const needsRefresh = force || !integ.accessToken || !integ.refreshToken || expiresAt - now < 5 * 60 * 1000;
  if (!needsRefresh) return integ;

  const basic = Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(QBO_OAUTH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integ.refreshToken,
    }),
  });
  if (!res.ok) {
    // Mark integration as errored so the UI surfaces it; throw so caller knows
    await db.update(integrations).set({ status: 'error', updatedAt: new Date() }).where(eq(integrations.id, integ.id));
    throw new Error(`QBO refresh failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as QboTokenResponse;
  const newExpiresAt = new Date(now + json.expires_in * 1000);
  // P1.6 audit fix 2026-07-31: capture refresh-token expiry.
  // Intuit sends it in the `x_refresh_token_expires_in` response header
  // (HTTP/2 canonical name) or `refresh_token_expires_in` in the body
  // depending on endpoint version. Default to 100 days if absent — that
  // was the historical cap before Intuit's new policy rolled out.
  const refreshExpiresInSec = Number(
    res.headers.get('x_refresh_token_expires_in')
    ?? json.refresh_token_expires_in
    ?? json.x_refresh_token_expires_in
    ?? (100 * 24 * 60 * 60)
  );
  const newRefreshExpiresAt = Number.isFinite(refreshExpiresInSec) && refreshExpiresInSec > 0
    ? new Date(now + refreshExpiresInSec * 1000)
    : null;
  if (newRefreshExpiresAt && newRefreshExpiresAt.getTime() - now < 7 * 24 * 60 * 60 * 1000) {
    console.warn(`[qbo] refresh token for orgId=${orgId} expires in <7 days (${newRefreshExpiresAt.toISOString()}). User must reconnect before expiry.`);
  }
  await db.update(integrations).set({
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? integ.refreshToken,
    expiresAt: newExpiresAt,
    status: 'connected',
    updatedAt: new Date(),
    metadata: {
      ...((integ.metadata as Record<string, unknown>) ?? {}),
      refreshExpiresAt: newRefreshExpiresAt ? newRefreshExpiresAt.toISOString() : null,
    },
  }).where(eq(integrations.id, integ.id));
  return { ...integ, accessToken: json.access_token, refreshToken: json.refresh_token ?? integ.refreshToken, expiresAt: newExpiresAt };
}

/** How many times a 429 is retried before giving up. */
const QBO_MAX_RETRIES = 3;

/**
 * QuickBooks throttles at 500 requests/minute per realm (and 40/second), and
 * answers a breach with 429.
 *
 * Same reasoning as the Xero helper: without this, a sync over a large company
 * file throws partway through, leaving some invoices written and the rest not.
 * A half-synced ledger shows an A/R total that is wrong with nothing on screen
 * saying so, which is worse than a sync that fails cleanly.
 *
 * Intuit does not reliably send Retry-After on throttle responses, so this
 * backs off exponentially from 2s rather than trusting a header that may not
 * be there.
 */
async function qboFetch(orgId: string, path: string) {
  let integ = await getFreshQboToken(orgId);
  const url = path.startsWith('http') ? path : `${QBO_BASE}/v3/company/${integ.realmId}${withMinorVersion(path)}`;
  let refreshedOn401 = false;

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${integ.accessToken}`, Accept: 'application/json' },
    });

    if (res.status === 429 && attempt < QBO_MAX_RETRIES) {
      const retryAfter = Number(res.headers.get('Retry-After'));
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 60_000)
          : Math.min(2000 * 2 ** attempt, 30_000);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    // A 401 can mean the access token was invalidated early (for example the
    // user reconnected elsewhere). Refresh once and retry before giving up.
    if (res.status === 401 && !refreshedOn401) {
      refreshedOn401 = true;
      integ = await getFreshQboToken(orgId, true);
      continue;
    }

    if (!res.ok) throw new Error(`QBO ${path} failed: ${res.status} ${await res.text()}${tidSuffix(res)}`);
    const json = await res.json();
    // QuickBooks reports some failures as a Fault object. Never treat one as an empty result:
    // an empty page would read as "no more invoices" and end a sync looking clean.
    if (json && typeof json === 'object' && (json as { Fault?: unknown }).Fault) {
      throw new Error(`QBO ${path} returned a Fault: ${JSON.stringify((json as { Fault: unknown }).Fault).slice(0, 300)}${tidSuffix(res)}`);
    }
    return json;
  }
}

/** Intuit asks for the intuit_tid response header when you report a problem. */
function tidSuffix(res: Response): string {
  const tid = res.headers.get('intuit_tid');
  return tid ? ` (intuit_tid ${tid})` : '';
}

async function qboPost(orgId: string, path: string, body: unknown) {
  const integ = await getFreshQboToken(orgId);
  const url = `${QBO_BASE}/v3/company/${integ.realmId}${withMinorVersion(path)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${integ.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`QBO POST ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export function qboAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.QBO_CLIENT_ID ?? '',
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: process.env.QBO_REDIRECT_URI ?? '',
    state,
  });
  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
}

export async function qboExchangeCode(code: string, realmId: string) {
  const basic = Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(QBO_OAUTH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.QBO_REDIRECT_URI ?? '',
    }),
  });
  if (!res.ok) throw new Error(`QBO exchange failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as QboTokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    realmId,
  };
}

export async function qboRefresh(refreshToken: string) {
  const basic = Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(QBO_OAUTH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`QBO refresh failed: ${res.status}`);
  return res.json();
}

export async function saveQboConnection(orgId: string, data: { accessToken: string; refreshToken: string; expiresIn: number; realmId: string }) {
  const expiresAt = new Date(Date.now() + data.expiresIn * 1000);
  const existing = await db.select().from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'quickbooks'))).limit(1);
  if (existing[0]) {
    await db.update(integrations).set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt,
      realmId: data.realmId,
      status: 'connected',
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(integrations.id, existing[0].id));
    return existing[0].id;
  }
  await ensureIntegrationProviderSchema();
  const [row] = await db.insert(integrations).values({
    id: nanoid(),
    orgId,
    provider: 'quickbooks',
    status: 'connected',
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt,
    realmId: data.realmId,
    lastSyncAt: new Date(),
  }).returning();
  return row.id;
}

/**
 * Disconnect QBO: revoke the token at QBO and delete the integration row.
 * Idempotent — returns ok if not connected.
 */
export async function disconnectQbo(orgId: string) {
  const [integ] = await db.select().from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'quickbooks'))).limit(1);
  if (!integ) return { ok: true };
  if (integ.accessToken && integ.refreshToken) {
    const basic = Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString('base64');
    try {
      await fetch(QBO_REVOKE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Basic ${basic}` },
        body: JSON.stringify({ token: integ.refreshToken }),
      });
    } catch {
      // best-effort; we still want to delete the local row
    }
  }
  await db.delete(integrations).where(eq(integrations.id, integ.id));
  return { ok: true };
}

// -------------------------------------------------------------------
// Read APIs (used by the sync endpoint)
// -------------------------------------------------------------------

export async function qboFetchAgingReport(orgId: string) {
  return qboFetch(orgId, `/reports/AgedReceivables?${new URLSearchParams({ query: 'SELECT * FROM AgeingReport MAXRESULTS 1000' }).toString()}`);
}

const QBO_INVOICE_FIELDS = 'Id, DocNumber, CustomerRef, TotalAmt, Balance, DueDate, TxnDate, CurrencyRef, EmailStatus, PrivateNote';
const QBO_PAGE = 1000;
const QBO_MAX_PAGES = 10;

/** List all open invoices (Balance > 0) from QBO. Returns raw Query response (first page only). */
export async function qboListOpenInvoices(orgId: string) {
  const query = `SELECT ${QBO_INVOICE_FIELDS} FROM Invoice WHERE Balance > '0' ORDERBY Id MAXRESULTS ${QBO_PAGE}`;
  return qboFetch(orgId, `/query?query=${encodeURIComponent(query)}`);
}

/**
 * Open invoices past the first 1000. The first page uses exactly the query above, so an
 * organisation with fewer than 1000 open invoices behaves as it always did; only a full
 * first page asks for more, with STARTPOSITION (1-based).
 */
async function qboListOpenInvoicesFrom(orgId: string, startPosition: number): Promise<QboInvoice[]> {
  const query = `SELECT ${QBO_INVOICE_FIELDS} FROM Invoice WHERE Balance > '0' ORDERBY Id STARTPOSITION ${startPosition} MAXRESULTS ${QBO_PAGE}`;
  const res = (await qboFetch(orgId, `/query?query=${encodeURIComponent(query)}`)) as QboQuery<'Invoice', QboInvoice>;
  return res?.QueryResponse?.Invoice ?? [];
}

/** The current state of specific invoices by id, including ones with no balance left. */
async function qboGetInvoicesByIds(orgId: string, ids: string[]): Promise<QboInvoice[]> {
  const out: QboInvoice[] = [];
  for (const batch of chunk(ids, 50)) {
    const query = `SELECT ${QBO_INVOICE_FIELDS} FROM Invoice WHERE Id IN (${batch.map((id) => `'${id.replace(/'/g, '')}'`).join(',')})`;
    const res = (await qboFetch(orgId, `/query?query=${encodeURIComponent(query)}`)) as QboQuery<'Invoice', QboInvoice>;
    out.push(...(res?.QueryResponse?.Invoice ?? []));
  }
  return out;
}

/**
 * The company's home currency, read once per sync. QuickBooks leaves CurrencyRef
 * off every transaction of a single-currency company, so a missing one means
 * home currency. Either read can fail without stopping the sync; the fallbacks
 * are in resolveHomeCurrency.
 */
export async function qboHomeCurrency(orgId: string): Promise<string> {
  const integ = await getFreshQboToken(orgId);
  let preferences: unknown = null;
  let companyInfo: unknown = null;
  try { preferences = await qboFetch(orgId, '/preferences'); } catch (e) { console.warn('[qbo] preferences read failed:', errorMessage(e)); }
  try { companyInfo = await qboFetch(orgId, `/companyinfo/${integ.realmId}`); } catch (e) { console.warn('[qbo] companyinfo read failed:', errorMessage(e)); }
  let orgBaseCurrency: string | null = null;
  try {
    const [o] = await db.select({ c: organizations.baseCurrency }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    orgBaseCurrency = o?.c ?? null;
  } catch { /* fall through to the default */ }
  return resolveHomeCurrency({ preferences: preferences as never, companyInfo: companyInfo as never, orgBaseCurrency }).currency;
}

const QBO_CUSTOMER_FIELDS = 'Id, DisplayName, CompanyName, PrimaryEmailAddr, PrimaryPhone, CurrencyRef';

/** List customers from QBO (first page). */
export async function qboListCustomers(orgId: string) {
  const query = `SELECT ${QBO_CUSTOMER_FIELDS} FROM Customer ORDERBY Id MAXRESULTS ${QBO_PAGE}`;
  return qboFetch(orgId, `/query?query=${encodeURIComponent(query)}`);
}

/**
 * Credit memos that still have credit left. A credit memo's Balance is what the
 * customer has not yet had applied. Payments with an unapplied amount (money
 * received but not matched to an invoice) count as credit too.
 */
type QboCreditMemo = { Id?: string; Balance?: number; CustomerRef?: { value?: string }; CurrencyRef?: { value?: string } };
async function qboListCreditMemosFrom(orgId: string, startPosition: number): Promise<QboCreditMemo[]> {
  const query = `SELECT Id, CustomerRef, Balance, CurrencyRef FROM CreditMemo WHERE Balance > '0' ORDERBY Id STARTPOSITION ${startPosition} MAXRESULTS ${QBO_PAGE}`;
  const res = (await qboFetch(orgId, `/query?query=${encodeURIComponent(query)}`)) as QboQuery<'CreditMemo', QboCreditMemo>;
  return res?.QueryResponse?.CreditMemo ?? [];
}

type QboPayment = { Id?: string; UnappliedAmt?: number; CustomerRef?: { value?: string }; CurrencyRef?: { value?: string } };
async function qboListUnappliedPaymentsFrom(orgId: string, startPosition: number): Promise<QboPayment[]> {
  const query = `SELECT Id, CustomerRef, UnappliedAmt, CurrencyRef FROM Payment WHERE UnappliedAmt > '0' ORDERBY Id STARTPOSITION ${startPosition} MAXRESULTS ${QBO_PAGE}`;
  const res = (await qboFetch(orgId, `/query?query=${encodeURIComponent(query)}`)) as QboQuery<'Payment', QboPayment>;
  return res?.QueryResponse?.Payment ?? [];
}

export async function qboListCredits(orgId: string, homeCurrency = 'USD'): Promise<{ credits: Array<{ customerExternalId: string; currency: string; amount: number }>; truncated: boolean }> {
  const all = await fetchAllPages((page) => qboListCreditMemosFrom(orgId, 1 + (page - 1) * QBO_PAGE), QBO_PAGE, QBO_MAX_PAGES);
  const credits = all.items
    .filter((m: QboCreditMemo) => Number(m.Balance ?? 0) > 0 && m.CustomerRef?.value)
    .map((m: QboCreditMemo) => ({ customerExternalId: String(m.CustomerRef!.value), currency: String(m.CurrencyRef?.value ?? homeCurrency), amount: Number(m.Balance) }));
  // A failed payments read throws, so the caller keeps the credit it already had
  // instead of storing a total that is missing unapplied payments.
  const pays = await fetchAllPages((page) => qboListUnappliedPaymentsFrom(orgId, 1 + (page - 1) * QBO_PAGE), QBO_PAGE, QBO_MAX_PAGES);
  for (const p of pays.items as QboPayment[]) {
    if (Number(p.UnappliedAmt ?? 0) > 0 && p.CustomerRef?.value) {
      credits.push({ customerExternalId: String(p.CustomerRef.value), currency: String(p.CurrencyRef?.value ?? homeCurrency), amount: Number(p.UnappliedAmt) });
    }
  }
  return { credits, truncated: all.truncated || pays.truncated };
}

/** Customers past the first 1000. Same approach as qboListOpenInvoicesFrom. */
async function qboListCustomersFrom(orgId: string, startPosition: number): Promise<QboCustomer[]> {
  const query = `SELECT ${QBO_CUSTOMER_FIELDS} FROM Customer ORDERBY Id STARTPOSITION ${startPosition} MAXRESULTS ${QBO_PAGE}`;
  const res = (await qboFetch(orgId, `/query?query=${encodeURIComponent(query)}`)) as QboQuery<'Customer', QboCustomer>;
  return res?.QueryResponse?.Customer ?? [];
}

/** Fetch a single invoice by id (with line items). */
export async function qboGetInvoice(orgId: string, invoiceId: string) {
  return qboFetch(orgId, `/invoice/${invoiceId}`);
}

// -------------------------------------------------------------------
// Write APIs
// -------------------------------------------------------------------

/**
 * Mark an invoice as paid in QBO. We do this by creating a Payment
 * object linked to the invoice, which QBO then reconciles to the
 * invoice's Balance (status becomes "Paid" automatically).
 *
 * If the invoice is already partially paid, we post only the
 * remaining balance.
 */
export async function qboRecordPayment(orgId: string, opts: {
  qboInvoiceId: string;
  customerRef: { value: string; name?: string };
  amount: number;
  currency: string;
  paymentRef: string; // our internal payment id, for traceability
}) {
  const body = {
    CustomerRef: { value: opts.customerRef.value, name: opts.customerRef.name },
    TotalAmt: opts.amount,
    Line: [
      {
        Amount: opts.amount,
        LinkedTxn: [{ TxnId: opts.qboInvoiceId, TxnType: 'Invoice' }],
      },
    ],
    // Private note shows in QBO UI for the customer; useful for trace
    PrivateNote: `Mugavi payment ${opts.paymentRef}`,
  };
  return qboPost(orgId, '/payment', body);
}

// -------------------------------------------------------------------
// Sync: QBO → our DB
// -------------------------------------------------------------------

interface QboSyncResult {
  customersUpserted: number;
  invoicesUpserted: number;
  invoicesMarkedPaid: number;
  /** Invoices voided or deleted in QuickBooks that were written off here. */
  invoicesClosed?: number;
  durationMs: number;
  errors: string[];
  /** True if a list query hit its MAXRESULTS cap — the sync completed
   * without error but is known-incomplete. Real STARTPOSITION-based
   * pagination is a larger follow-up (needs a QBO sandbox to verify the
   * loop terminates and doesn't double-fetch); this at least stops the
   * result from claiming a clean, complete sync when it wasn't one. */
  truncated?: boolean;
}

/**
 * Pull all open invoices + their customers from QBO and upsert into
 * our DB. Existing rows are matched by (orgId, provider, externalId).
 * Already-paid invoices in QBO that are still 'sent'/'overdue' locally
 * are flipped to 'paid' (this is how we discover payments we didn't
 * initiate through Mugavi).
 */
export async function syncQboForOrg(orgId: string): Promise<QboSyncResult> {
  const t0 = Date.now();
  const errors: string[] = [];
  let customersUpserted = 0;
  let invoicesUpserted = 0;
  let invoicesMarkedPaid = 0;
  let invoicesClosed = 0;
  let truncated = false;
  // Looked up once, the first time a currency is needed, and shared by invoices and credit.
  let homeCurrencyP: Promise<string> | null = null;
  const home = (): Promise<string> => (homeCurrencyP ??= qboHomeCurrency(orgId).catch(() => 'USD'));
  const QBO_PAGE_SIZE = 1000; // matches MAXRESULTS in qboListCustomers/qboListOpenInvoices

  // 1. Customers
  let qboCustomers: QboCustomer[] = [];
  try {
    const res = (await qboListCustomers(orgId)) as QboQuery<'Customer', QboCustomer>;
    qboCustomers = res?.QueryResponse?.Customer ?? [];
    if (qboCustomers.length >= QBO_PAGE_SIZE) {
      const rest = await fetchAllPages((page) => qboListCustomersFrom(orgId, 1 + page * QBO_PAGE_SIZE), QBO_PAGE_SIZE, QBO_MAX_PAGES - 1);
      qboCustomers = [...qboCustomers, ...rest.items];
      if (rest.truncated) truncated = true;
    }
  } catch (e: unknown) {
    errors.push(`customers: ${errorMessage(e)}`);
  }

  for (const c of qboCustomers) {
    try {
      const externalId = String(c.Id);
      const name = c.DisplayName ?? c.CompanyName ?? 'Unknown';
      const email = c.PrimaryEmailAddr?.Address ?? null;
      const phone = c.PrimaryPhone?.FreeFormNumber ?? null;
      const existing = await db
        .select({ id: customersTbl.id })
        .from(customersTbl)
        .where(and(eq(customersTbl.orgId, orgId), eq(customersTbl.externalId, externalId)))
        .limit(1);
      if (existing[0]) {
        await db.update(customersTbl).set({ name, email, phone, updatedAt: new Date() }).where(eq(customersTbl.id, existing[0].id));
      } else {
        await db.insert(customersTbl).values({
          id: nanoid(),
          orgId,
          externalId,
          name,
          email,
          phone,
        });
      }
      customersUpserted++;
    } catch (e: unknown) {
      errors.push(`customer ${c?.Id}: ${errorMessage(e)}`);
    }
  }

  // 2. Invoices
  let qboInvoices: QboInvoice[] = [];
  try {
    const res = (await qboListOpenInvoices(orgId)) as QboQuery<'Invoice', QboInvoice>;
    qboInvoices = res?.QueryResponse?.Invoice ?? [];
    if (qboInvoices.length >= QBO_PAGE_SIZE) {
      // A full first page: read the rest, page by page, up to a limit.
      const rest = await fetchAllPages((page) => qboListOpenInvoicesFrom(orgId, 1 + page * QBO_PAGE_SIZE), QBO_PAGE_SIZE, QBO_MAX_PAGES - 1);
      qboInvoices = [...qboInvoices, ...rest.items];
      if (rest.truncated) truncated = true;
    }
  } catch (e: unknown) {
    errors.push(`invoices: ${errorMessage(e)}`);
  }

  // Voided or deleted in QuickBooks: stop chasing it. Written off, as Xero's VOIDED/DELETED are.
  // Amounts on our side are left as they were, and an invoice we never imported is not created.
  const closeInvoice = async (externalId: string, closure: 'voided' | 'deleted'): Promise<void> => {
    const [row] = await db
      .select({ id: invoicesTbl.id, status: invoicesTbl.status, customerId: invoicesTbl.customerId, number: invoicesTbl.number })
      .from(invoicesTbl)
      .where(and(eq(invoicesTbl.orgId, orgId), eq(invoicesTbl.externalId, externalId)))
      .limit(1);
    if (!row || row.status === 'written_off') return;
    await db.update(invoicesTbl).set({ status: qboSyncedStatus({ closure, total: 0, due: 0, dueDate: new Date(), now: new Date() }), paidAt: null, updatedAt: new Date() }).where(eq(invoicesTbl.id, row.id));
    await db.insert(timelineEvents).values({
      id: nanoid(), orgId, customerId: row.customerId, invoiceId: row.id, eventType: 'invoice_closed',
      title: `Invoice ${row.number} was ${closure} in QuickBooks`,
      description: 'Marked written off so no more reminders go out. Reopen it if this was a mistake.',
    });
    invoicesClosed++;
  };

  const applyInvoice = async (inv: QboInvoice): Promise<void> => {
    try {
      const externalId = String(inv.Id);
      const closure = qboClosure(inv);
      if (closure) { await closeInvoice(externalId, closure); return; }
      const customerExternalId = String(inv.CustomerRef?.value ?? '');
      if (!customerExternalId) return;

      // Find the local customer by external id
      const [localCustomer] = await db
        .select({ id: customersTbl.id })
        .from(customersTbl)
        .where(and(eq(customersTbl.orgId, orgId), eq(customersTbl.externalId, customerExternalId)))
        .limit(1);

      let customerId: string;
      if (localCustomer) {
        customerId = localCustomer.id;
      } else {
        // Customer not in our DB (e.g. invoice references a deleted customer
        // or sync was partial). Create a stub so the invoice has a parent.
        const [stub] = await db.insert(customersTbl).values({
          id: nanoid(),
          orgId,
          externalId: customerExternalId,
          name: inv.CustomerRef?.name ?? `QBO Customer ${customerExternalId}`,
        }).returning();
        customerId = stub.id;
        customersUpserted++;
      }

      // `||` not `??` -- QuickBooks can return DocNumber as '' (not
      // null/undefined), which `??` lets through. See matching fix in
      // xero.ts (same bug class, same symptom: blank invoice number).
      const number = inv.DocNumber || externalId;
      const total = Number(inv.TotalAmt ?? 0);
      const balance = Number(inv.Balance ?? 0);
      const amountPaid = Math.max(0, total - balance);
      const currency = inv.CurrencyRef?.value ?? (await home());
      const issueDate = inv.TxnDate ? new Date(inv.TxnDate) : new Date();
      const dueDate = inv.DueDate ? new Date(inv.DueDate) : issueDate;
      // In QBO, Balance=0 means Paid. Balance < Total means Partial.
      const syncedStatus = qboSyncedStatus({ closure: null, total, due: balance, dueDate, now: new Date() });

      const existing = await db
        .select({ id: invoicesTbl.id, status: invoicesTbl.status, paidAt: invoicesTbl.paidAt })
        .from(invoicesTbl)
        .where(and(eq(invoicesTbl.orgId, orgId), eq(invoicesTbl.externalId, externalId)))
        .limit(1);

      if (existing[0]) {
        // An owner's dispute or write-off holds while the invoice is still open in QBO.
        const status = reconcileStatus(existing[0].status, syncedStatus);
        const wasUnpaid = existing[0].status !== 'paid';
        // IMPORTANT: paidAt records WHEN the invoice was paid, not when we
        // last synced. Overwriting it with new Date() on every sync inflates
        // DSO by one day per day and poisons customer.paymentBehavior,
        // which feeds the dunning AI. Only stamp a date on the unpaid →
        // paid transition; preserve the original payment date thereafter.
        const paidAt = status === 'paid' ? (existing[0].paidAt ?? new Date()) : null;
        await db.update(invoicesTbl).set({
          number,
          amount: String(total),
          amountPaid: String(amountPaid),
          currency,
          issueDate,
          dueDate,
          status,
          paidAt,
          updatedAt: new Date(),
        }).where(eq(invoicesTbl.id, existing[0].id));
        if (wasUnpaid && status === 'paid') invoicesMarkedPaid++;
      } else {
        const status = syncedStatus;
        await db.insert(invoicesTbl).values({
          id: nanoid(),
          orgId,
          customerId,
          externalId,
          number,
          amount: String(total),
          amountPaid: String(amountPaid),
          currency,
          issueDate,
          dueDate,
          status,
          paidAt: status === 'paid' ? new Date() : null,
        });
      }
      invoicesUpserted++;
    } catch (e: unknown) {
      errors.push(`invoice ${inv?.Id}: ${errorMessage(e)}`);
    }
  };

  for (const inv of qboInvoices) await applyInvoice(inv);

  // Invoices we hold as open that QBO did not list as open: paid there. The open
  // query never returns them, so ask by id and apply what QBO says. Reported but
  // never undoes what was synced above.
  try {
    const seen = new Set(qboInvoices.map((i) => String(i.Id)));
    const held = await db
      .select({ externalId: invoicesTbl.externalId, status: invoicesTbl.status })
      .from(invoicesTbl)
      .where(and(eq(invoicesTbl.orgId, orgId), inArray(invoicesTbl.status, ['sent', 'viewed', 'partial', 'overdue', 'disputed'])));
    const missing = held
      .filter((h: { externalId: string | null; status: string }) => h.externalId && needsLookup(h.status) && !seen.has(h.externalId))
      .map((h: { externalId: string | null }) => h.externalId as string);
    if (missing.length > 0) {
      const found = await qboGetInvoicesByIds(orgId, missing);
      for (const inv of found) await applyInvoice(inv);
      // A deleted invoice is not returned by any query. Ask for it directly and close it only on
      // a clear "not found"; any other failure (throttle, auth, outage) leaves it open and is reported.
      const returned = new Set(found.map((i) => String(i.Id)));
      for (const id of missing.filter((m: string) => !returned.has(m))) {
        try {
          const one = (await qboGetInvoice(orgId, id)) as { Invoice?: QboInvoice };
          if (one?.Invoice) await applyInvoice(one.Invoice);
          else await closeInvoice(id, 'deleted');
        } catch (e: unknown) {
          if (isQboNotFound(e)) await closeInvoice(id, 'deleted');
          else errors.push(`reconcile invoice ${id}: ${errorMessage(e)}`);
        }
      }
    }
  } catch (e: unknown) {
    errors.push(`reconcile: ${errorMessage(e)}`);
  }


  // 3a. Unapplied credit memos. Only stored when read in full, so a failed or
  // cut-off read never erases real credit and restarts the chasing.
  try {
    const found = await qboListCredits(orgId, await home());
    if (!found.truncated) await replaceCredits(orgId, found.credits);
    else errors.push('credit (memos or unapplied payments): too many to read in one sync, so credit was left as it was');
  } catch (e: unknown) {
    errors.push(`credit (memos or unapplied payments): ${errorMessage(e)}`);
  }

  // 3. Touch lastSyncAt
  await db.update(integrations).set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'quickbooks')));

  if (truncated) errors.push('sync stopped at its limit (10,000 customers or open invoices), so some may not have been imported');
  return { customersUpserted, invoicesUpserted, invoicesMarkedPaid, invoicesClosed, durationMs: Date.now() - t0, errors, truncated };
}

/**
 * Stubs added in P1.6 audit fix 2026-07-31 so that callers (e.g.
 * /api/integrations/sync) can reference reconnect-required semantics
 * without the QBO refresh-token-expiry migration depending on the
 * larger QBO refactor (which is still in dirty tree).
 *
 * `QboReconnectRequiredError` — thrown when the cached refresh token
 * has reached its `metadata.refreshExpiresAt`. Caller surfaces to UI.
 *
 * `getQboReconnectUrl(orgId)` — returns the OAuth reconnect URL for
 * the org. Uses QBO_CONNECT_URL or returns the connect route as fallback.
 */
export class QboReconnectRequiredError extends Error {
  constructor(message = 'QuickBooks reconnect required', public readonly orgId?: string) {
    super(message);
    this.name = 'QboReconnectRequiredError';
  }
}

export function getQboReconnectUrl(orgId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mugavi.com';
  return `${base}/api/quickbooks/connect?orgId=${encodeURIComponent(orgId)}`;
}
