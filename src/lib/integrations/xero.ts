/**
 * Xero integration — OAuth 2.0, token refresh, customer/invoice sync,
 * and payment pushback.
 *
 * Docs: https://developer.xero.com/documentation/guides/oauth2
 *
 * Token model:
 *  - Access token expires in 30 min (1800s).
 *  - Refresh token expires in 60 days but is rotated on every refresh.
 *  - Xero uses a tenantId (organisationId) header for all API calls.
 *    On first sync, we resolve it by calling /Organisations and storing
 *    the first one (most Xero apps are single-tenant per connection).
 */
import { db } from '@/db';
import { integrations, customers as customersTbl, invoices as invoicesTbl, payments as paymentsTbl } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

const XERO_OAUTH = 'https://identity.xero.com/connect/token';
const XERO_API = 'https://api.xero.com/api.xro/2.0';

/**
 * Xero's Accounting API returns date fields (Invoice.Date, Invoice.DueDate,
 * UpdatedDateUTC, etc.) in the legacy Microsoft/.NET JSON date format —
 * "/Date(1670716800000+0000)/" — not ISO 8601, regardless of Accept header.
 * `new Date(rawValue)` silently produces an Invalid Date for this format
 * (confirmed against a live sync: every real-org invoice's issue/due date
 * would have come through as Invalid Date, corrupting every days-overdue
 * and aging calculation downstream). Handles both this format and plain
 * ISO strings, since some fields/API versions do return ISO directly.
 */
function parseXeroDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;
  const msMatch = value.match(/\/Date\((\d+)([+-]\d{4})?\)\//);
  if (msMatch) {
    const d = new Date(Number(msMatch[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
const XERO_CONNECTIONS = 'https://api.xero.com/Connections';

// Auto-refresh access token if within 5 min of expiry.
async function getFreshXero(orgId: string) {
  const [integ] = await db.select().from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'xero'))).limit(1);
  if (!integ) throw new Error('Xero not connected');

  const now = Date.now();
  const expiresAt = integ.expiresAt ? new Date(integ.expiresAt).getTime() : 0;
  const needsRefresh = !integ.accessToken || !integ.refreshToken || expiresAt - now < 5 * 60 * 1000;

  if (!needsRefresh) {
    // Ensure we have a tenantId; if not, resolve on first use
    if (!integ.tenantId) await resolveXeroTenant(orgId, integ.accessToken!, integ.id);
    return integ;
  }

  const basic = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(XERO_OAUTH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', Authorization: `Basic ${basic}` },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integ.refreshToken,
    }),
  });
  if (!res.ok) {
    await db.update(integrations).set({ status: 'error', updatedAt: new Date() }).where(eq(integrations.id, integ.id));
    throw new Error(`Xero refresh failed: ${res.status} ${await res.text()}`);
  }
  const json: any = await res.json();
  const newExpiresAt = new Date(now + (json.expires_in as number) * 1000);
  await db.update(integrations).set({
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? integ.refreshToken,
    expiresAt: newExpiresAt,
    status: 'connected',
    updatedAt: new Date(),
  }).where(eq(integrations.id, integ.id));
  const updated = { ...integ, accessToken: json.access_token, refreshToken: json.refresh_token ?? integ.refreshToken, expiresAt: newExpiresAt };

  // Tenant may also need to be re-resolved if our session was wiped
  if (!updated.tenantId) await resolveXeroTenant(orgId, updated.accessToken!, integ.id);
  return updated;
}

async function resolveXeroTenant(orgId: string, accessToken: string, integrationId: string) {
  const res = await fetch(XERO_CONNECTIONS, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Xero connections failed: ${res.status}`);
  const json: any = await res.json();
  // /connections returns EVERY org this Xero user has ever authorized for
  // this app, not just the one from the auth flow just completed --
  // disconnecting in our app only deletes our local row, it never revokes
  // on Xero's side (see disconnectXero()'s comment). Blindly taking index 0
  // silently re-selected a stale, previously-authorized org after a user
  // disconnected and reconnected to a *different* one (observed directly:
  // reconnecting to Xero's Demo Company kept syncing an old, empty org
  // instead). updatedDateUtc reflects the most recent (re)authorization per
  // Xero's own docs, so sort on that and take the most recent.
  const sorted = [...(json ?? [])].sort((a: any, b: any) =>
    new Date(b.updatedDateUtc ?? b.createdDateUtc ?? 0).getTime() - new Date(a.updatedDateUtc ?? a.createdDateUtc ?? 0).getTime(),
  );
  const mostRecent = sorted[0];
  if (!mostRecent?.tenantId) throw new Error('Xero: no tenant found for this connection');
  await db.update(integrations).set({ tenantId: mostRecent.tenantId, updatedAt: new Date() }).where(eq(integrations.id, integrationId));
  return mostRecent.tenantId as string;
}

async function xeroFetch(orgId: string, path: string, init?: RequestInit) {
  const integ = await getFreshXero(orgId);
  if (!integ.tenantId) throw new Error('Xero: tenant not resolved');
  const res = await fetch(`${XERO_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${integ.accessToken}`,
      Accept: 'application/json',
      'Xero-Tenant-Id': integ.tenantId,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Xero ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export function xeroAuthUrl(state: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.XERO_CLIENT_ID ?? '',
    redirect_uri: process.env.XERO_REDIRECT_URI ?? '',
    // Xero split the broad `accounting.transactions` scope into granular
    // scopes; apps created on/after 2026-03-02 are rejected outright at the
    // authorize step if they request the deprecated broad scope (this is the
    // leading hypothesis for the identity/error page seen in production).
    // accounting.invoices.read covers invoices/credit notes/purchase orders
    // (read-only — we never write invoices). accounting.payments is
    // read/write since createPayment() POSTs to /Payments. accounting.contacts
    // was not part of the split and is unchanged.
    // Source: https://developer.xero.com/documentation/guides/oauth2/scopes/
    scope: 'openid profile email accounting.invoices.read accounting.contacts accounting.payments offline_access',
    state,
  });
  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
}

export async function xeroExchangeCode(code: string) {
  const basic = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(XERO_OAUTH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', Authorization: `Basic ${basic}` },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.XERO_REDIRECT_URI ?? '',
    }),
  });
  if (!res.ok) throw new Error(`Xero exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function xeroRefresh(refreshToken: string) {
  const basic = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(XERO_OAUTH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`Xero refresh failed: ${res.status}`);
  return res.json();
}

export async function saveXeroConnection(orgId: string, tokens: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  tenant_id?: string;
}) {
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 1800) * 1000);
  const existing = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'xero')))
    .limit(1);
  if (existing[0]) {
    await db
      .update(integrations)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        tenantId: tokens.tenant_id ?? null,
        status: 'connected',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, existing[0].id));
    return existing[0].id;
  }
  const [row] = await db
    .insert(integrations)
    .values({
      id: nanoid(),
      orgId,
      provider: 'xero',
      status: 'connected',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      tenantId: tokens.tenant_id ?? null,
      lastSyncAt: new Date(),
    })
    .returning();
  return row.id;
}

// -------------------------------------------------------------------
// Read APIs
// -------------------------------------------------------------------

/**
 * List all AUTHORISED + PAID invoices that still have a balance due.
 * Xero's status field is uppercase string: 'AUTHORISED' | 'PAID' | 'VOIDED' | 'DRAFT'.
 * We fetch both AUTHORISED (open) and PAID (zero balance) so we can
 * detect payments the customer made outside Collectly.
 */
export async function xeroListOpenInvoices(orgId: string) {
  // Fetch in two passes — Xero's filter syntax for OR is awkward
  const auth: any = await xeroFetch(orgId, `/Invoices?where=Status=="AUTHORISED"&page=1`);
  const paid: any = await xeroFetch(orgId, `/Invoices?where=Status=="PAID"&page=1`);
  return [
    ...((auth?.Invoices ?? []) as any[]),
    ...((paid?.Invoices ?? []) as any[]),
  ];
}

/** List all contacts (customers) from Xero. */
export async function xeroListContacts(orgId: string) {
  const res: any = await xeroFetch(orgId, `/Contacts?page=1`);
  return (res?.Contacts ?? []) as any[];
}

// -------------------------------------------------------------------
// Write APIs
// -------------------------------------------------------------------

/**
 * Create a Payment in Xero and allocate it to the given invoice.
 * This is how we push a Collectly-collected payment back to the
 * customer's books.
 */
export async function xeroRecordPayment(orgId: string, opts: {
  xeroInvoiceId: string;
  xeroContactId: string;
  accountCode?: string;
  amount: number;
  currency: string;
  reference: string;
}) {
  const body: any = {
    Invoice: { InvoiceID: opts.xeroInvoiceId },
    Account: opts.accountCode ? { Code: opts.accountCode } : { Code: '200' }, // 200 = "Accounts Receivable" default
    Amount: opts.amount,
    CurrencyRate: 1, // For single-currency orgs; multi-currency needs lookup
    Reference: `Collectly ${opts.reference}`,
    Date: new Date().toISOString().slice(0, 10),
  };
  if (opts.currency) body.Currency = { Code: opts.currency };
  return xeroFetch(orgId, '/Payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Payments: [body] }),
  });
}

/**
 * Disconnect Xero: clear our local row. (Xero has no equivalent of
 * QBO's /tokens/revoke endpoint for app-driven disconnect; tokens
 * expire naturally. The user can also revoke manually in Xero.)
 */
export async function disconnectXero(orgId: string) {
  const [integ] = await db.select().from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'xero'))).limit(1);
  if (!integ) return { ok: true };
  await db.delete(integrations).where(eq(integrations.id, integ.id));
  return { ok: true };
}

// -------------------------------------------------------------------
// Sync
// -------------------------------------------------------------------

interface XeroSyncResult {
  customersUpserted: number;
  invoicesUpserted: number;
  invoicesMarkedPaid: number;
  durationMs: number;
  errors: string[];
}

export async function syncXeroForOrg(orgId: string): Promise<XeroSyncResult> {
  const t0 = Date.now();
  const errors: string[] = [];
  let customersUpserted = 0;
  let invoicesUpserted = 0;
  let invoicesMarkedPaid = 0;

  // 1. Contacts → customers
  let xeroContacts: any[] = [];
  try {
    xeroContacts = await xeroListContacts(orgId);
  } catch (e: any) {
    errors.push(`contacts: ${e?.message ?? e}`);
  }

  for (const c of xeroContacts) {
    try {
      const externalId = String(c.ContactID);
      const name = c.Name ?? (`${c.FirstName ?? ''} ${c.LastName ?? ''}`.trim() || 'Unknown');
      const email = c.EmailAddress ?? null;
      const phone = (c.Phones ?? []).find((p: any) => p.PhoneType === 'MOBILE' || p.PhoneType === 'DEFAULT')?.PhoneNumber ?? null;
      const existing = await db
        .select({ id: customersTbl.id })
        .from(customersTbl)
        .where(and(eq(customersTbl.orgId, orgId), eq(customersTbl.externalId, externalId)))
        .limit(1);
      if (existing[0]) {
        await db.update(customersTbl).set({ name, email, phone, updatedAt: new Date() }).where(eq(customersTbl.id, existing[0].id));
      } else {
        await db.insert(customersTbl).values({ id: nanoid(), orgId, externalId, name, email, phone });
      }
      customersUpserted++;
    } catch (e: any) {
      errors.push(`contact ${c?.ContactID}: ${e?.message ?? e}`);
    }
  }

  // 2. Invoices
  let xeroInvoices: any[] = [];
  try {
    xeroInvoices = await xeroListOpenInvoices(orgId);
  } catch (e: any) {
    errors.push(`invoices: ${e?.message ?? e}`);
  }

  for (const inv of xeroInvoices) {
    try {
      const externalId = String(inv.InvoiceID);
      const contactExternalId = String(inv.Contact?.ContactID ?? '');
      if (!contactExternalId) continue;

      const [localCustomer] = await db
        .select({ id: customersTbl.id })
        .from(customersTbl)
        .where(and(eq(customersTbl.orgId, orgId), eq(customersTbl.externalId, contactExternalId)))
        .limit(1);

      let customerId: string;
      if (localCustomer) {
        customerId = localCustomer.id;
      } else {
        const [stub] = await db.insert(customersTbl).values({
          id: nanoid(),
          orgId,
          externalId: contactExternalId,
          name: inv.Contact?.Name ?? `Xero Contact ${contactExternalId}`,
        }).returning();
        customerId = stub.id;
        customersUpserted++;
      }

      // `||` not `??` -- Xero sometimes returns InvoiceNumber as '' (not
      // null/undefined), which `??` lets through, producing an invoice with
      // no visible number anywhere it's displayed (e.g. dunning emails
      // rendering "Invoice #" with nothing after it).
      const number = inv.InvoiceNumber || externalId;
      const total = Number(inv.Total ?? 0);
      const amountDue = Number(inv.AmountDue ?? 0);
      const amountPaid = Math.max(0, total - amountDue);
      const currency = inv.CurrencyCode ?? 'USD';
      const issueDate = parseXeroDate(inv.Date) ?? new Date();
      const dueDate = parseXeroDate(inv.DueDate) ?? issueDate;
      const status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' = amountDue === 0
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
        // See quickbooks.ts — paidAt must not be re-stamped on every sync or
        // DSO inflates by a day per day. Preserve the original payment date.
        const preservedPaidAt = status === 'paid' ? (existing[0].paidAt ?? new Date()) : null;
        await db.update(invoicesTbl).set({
          number,
          amount: String(total),
          amountPaid: String(amountPaid),
          currency,
          issueDate,
          dueDate,
          status,
          paidAt: preservedPaidAt,
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
      errors.push(`invoice ${inv?.InvoiceID}: ${e?.message ?? e}`);
    }
  }

  await db.update(integrations).set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'xero')));

  return { customersUpserted, invoicesUpserted, invoicesMarkedPaid, durationMs: Date.now() - t0, errors };
}
