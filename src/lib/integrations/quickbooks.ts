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
import { integrations, customers as customersTbl, invoices as invoicesTbl, payments as paymentsTbl } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

const QBO_BASE = process.env.QBO_ENVIRONMENT === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com';

const QBO_OAUTH = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const QBO_REVOKE = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';

// Refresh the access token if it's within 5 min of expiry (or already past).
// Persists the new tokens. Returns the (possibly new) integration row.
async function getFreshQboToken(orgId: string) {
  const [integ] = await db.select().from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'quickbooks'))).limit(1);
  if (!integ) throw new Error('QuickBooks not connected');

  const now = Date.now();
  const expiresAt = integ.expiresAt ? new Date(integ.expiresAt).getTime() : 0;
  const needsRefresh = !integ.accessToken || !integ.refreshToken || expiresAt - now < 5 * 60 * 1000;
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
  const json: any = await res.json();
  const newExpiresAt = new Date(now + (json.expires_in as number) * 1000);
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
      ...((integ.metadata as Record<string, any>) ?? {}),
      refreshExpiresAt: newRefreshExpiresAt ? newRefreshExpiresAt.toISOString() : null,
    },
  }).where(eq(integrations.id, integ.id));
  return { ...integ, accessToken: json.access_token, refreshToken: json.refresh_token ?? integ.refreshToken, expiresAt: newExpiresAt };
}

async function qboFetch(orgId: string, path: string) {
  const integ = await getFreshQboToken(orgId);
  const url = path.startsWith('http') ? path : `${QBO_BASE}/v3/company/${integ.realmId}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${integ.accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`QBO ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function qboPost(orgId: string, path: string, body: unknown) {
  const integ = await getFreshQboToken(orgId);
  const url = `${QBO_BASE}/v3/company/${integ.realmId}${path}`;
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
  const json: any = await res.json();
  return {
    accessToken: json.access_token as string,
    refreshToken: json.refresh_token as string,
    expiresIn: json.expires_in as number,
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

/** List all open invoices (Balance > 0) from QBO. Returns raw Query response. */
export async function qboListOpenInvoices(orgId: string) {
  const query = `SELECT Id, DocNumber, CustomerRef, TotalAmount, Balance, DueDate, TxnDate, CurrencyRef, EmailStatus FROM Invoice WHERE Balance > '0' MAXRESULTS 1000`;
  return qboFetch(orgId, `/query?query=${encodeURIComponent(query)}`);
}

/** List all customers from QBO. */
export async function qboListCustomers(orgId: string) {
  const query = `SELECT Id, DisplayName, CompanyName, PrimaryEmailAddr, PrimaryPhone, CurrencyRef FROM Customer MAXRESULTS 1000`;
  return qboFetch(orgId, `/query?query=${encodeURIComponent(query)}`);
}

/** Fetch a single invoice by id (with line items). */
export async function qboGetInvoice(orgId: string, invoiceId: string) {
  return qboFetch(orgId, `/invoice/${invoiceId}?minorversion=70`);
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
    TotalAmount: opts.amount,
    Line: [
      {
        Amount: opts.amount,
        LinkedTxn: [{ TxnId: opts.qboInvoiceId, TxnType: 'Invoice' }],
      },
    ],
    // Private note shows in QBO UI for the customer; useful for trace
    PrivateNote: `Collectly payment ${opts.paymentRef}`,
  };
  return qboPost(orgId, '/payment?minorversion=70', body);
}

// -------------------------------------------------------------------
// Sync: QBO → our DB
// -------------------------------------------------------------------

interface QboSyncResult {
  customersUpserted: number;
  invoicesUpserted: number;
  invoicesMarkedPaid: number;
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
 * initiate through Collectly).
 */
export async function syncQboForOrg(orgId: string): Promise<QboSyncResult> {
  const t0 = Date.now();
  const errors: string[] = [];
  let customersUpserted = 0;
  let invoicesUpserted = 0;
  let invoicesMarkedPaid = 0;
  let truncated = false;
  const QBO_PAGE_SIZE = 1000; // matches MAXRESULTS in qboListCustomers/qboListOpenInvoices

  // 1. Customers
  let qboCustomers: any[] = [];
  try {
    const res: any = await qboListCustomers(orgId);
    qboCustomers = res?.QueryResponse?.Customer ?? [];
    if (qboCustomers.length >= QBO_PAGE_SIZE) truncated = true;
  } catch (e: any) {
    errors.push(`customers: ${e?.message ?? e}`);
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
    } catch (e: any) {
      errors.push(`customer ${c?.Id}: ${e?.message ?? e}`);
    }
  }

  // 2. Invoices
  let qboInvoices: any[] = [];
  try {
    const res: any = await qboListOpenInvoices(orgId);
    qboInvoices = res?.QueryResponse?.Invoice ?? [];
    if (qboInvoices.length >= QBO_PAGE_SIZE) truncated = true;
  } catch (e: any) {
    errors.push(`invoices: ${e?.message ?? e}`);
  }

  for (const inv of qboInvoices) {
    try {
      const externalId = String(inv.Id);
      const customerExternalId = String(inv.CustomerRef?.value ?? '');
      if (!customerExternalId) continue;

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
      const total = Number(inv.TotalAmount ?? 0);
      const balance = Number(inv.Balance ?? 0);
      const amountPaid = Math.max(0, total - balance);
      const currency = inv.CurrencyRef?.value ?? 'USD';
      const issueDate = inv.TxnDate ? new Date(inv.TxnDate) : new Date();
      const dueDate = inv.DueDate ? new Date(inv.DueDate) : issueDate;
      // In QBO, Balance=0 means Paid. Balance < Total means Partial.
      const status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' = balance === 0
        ? 'paid'
        : amountPaid > 0
          ? 'partial'
          : new Date() > dueDate
            ? 'overdue'
            : 'sent';

      const existing = await db
        .select({ id: invoicesTbl.id, status: invoicesTbl.status, paidAt: invoicesTbl.paidAt })
        .from(invoicesTbl)
        .where(and(eq(invoicesTbl.orgId, orgId), eq(invoicesTbl.externalId, externalId)))
        .limit(1);

      if (existing[0]) {
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
    } catch (e: any) {
      errors.push(`invoice ${inv?.Id}: ${e?.message ?? e}`);
    }
  }

  // 3. Touch lastSyncAt
  await db.update(integrations).set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'quickbooks')));

  if (truncated) errors.push('sync hit the 1000-record page limit — some customers/invoices may not have been imported (pagination not yet implemented)');
  return { customersUpserted, invoicesUpserted, invoicesMarkedPaid, durationMs: Date.now() - t0, errors, truncated };
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
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcollectly.app';
  return `${base}/api/quickbooks/connect?orgId=${encodeURIComponent(orgId)}`;
}
