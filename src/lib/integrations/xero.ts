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
import { integrations, customers as customersTbl, invoices as invoicesTbl } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { fetchAllPages, chunk } from '@/lib/integrations/paging';
import { needsLookup, reconcileStatus, xeroSyncedStatus } from '@/lib/integrations/sync-status';
import { nanoid, errorMessage } from '@/lib/utils';
import { replaceCredits } from '@/lib/integrations/credits';

const XERO_OAUTH = 'https://identity.xero.com/connect/token';
// Tests point this at a local stand-in. Never honoured in production.
const XERO_API = (process.env.NODE_ENV !== 'production' && process.env.XERO_API_BASE) || 'https://api.xero.com/api.xro/2.0';

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
  const json = (await res.json()) as XeroTokenResponse;
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
  const json = (await res.json()) as XeroTenant[];
  // /connections returns EVERY org this Xero user has ever authorized for
  // this app, not just the one from the auth flow just completed --
  // disconnecting in our app only deletes our local row, it never revokes
  // on Xero's side (see disconnectXero()'s comment). Blindly taking index 0
  // silently re-selected a stale, previously-authorized org after a user
  // disconnected and reconnected to a *different* one (observed directly:
  // reconnecting to Xero's Demo Company kept syncing an old, empty org
  // instead). updatedDateUtc reflects the most recent (re)authorization per
  // Xero's own docs, so sort on that and take the most recent.
  const sorted = [...(json ?? [])].sort((a: XeroTenant, b: XeroTenant) =>
    new Date(b.updatedDateUtc ?? b.createdDateUtc ?? 0).getTime() - new Date(a.updatedDateUtc ?? a.createdDateUtc ?? 0).getTime(),
  );
  const mostRecent = sorted[0];
  if (!mostRecent?.tenantId) throw new Error('Xero: no tenant found for this connection');
  await db.update(integrations).set({ tenantId: mostRecent.tenantId, updatedAt: new Date() }).where(eq(integrations.id, integrationId));
  return mostRecent.tenantId as string;
}

/* Xero ships no types package for the surface this module uses. These cover
   only the fields actually read — narrower than `any`, and an upstream rename
   fails the build instead of silently writing undefined to the DB. */
type XeroTokenResponse = { access_token: string; refresh_token: string; expires_in: number };
type XeroTenant = { tenantId: string; tenantName?: string; createdDateUtc?: string; updatedDateUtc?: string };
type XeroPhone = { PhoneType?: string; PhoneNumber?: string };
type XeroContact = {
  ContactID: string;
  Name?: string;
  FirstName?: string;
  LastName?: string;
  EmailAddress?: string;
  Phones?: XeroPhone[];
};
type XeroInvoice = {
  InvoiceID: string;
  InvoiceNumber?: string;
  Date?: string;
  DueDate?: string;
  Status?: string;
  Total?: number;
  AmountDue?: number;
  CurrencyCode?: string;
  Contact?: { ContactID?: string; Name?: string };
};
type XeroList = { Contacts?: XeroContact[]; Invoices?: XeroInvoice[] };

/** How many times a 429 is retried before giving up. */
const XERO_MAX_RETRIES = 3;

/**
 * Xero enforces 60 calls/minute and 5,000/day per tenant, and answers a breach
 * with 429 plus a `Retry-After` header in seconds.
 *
 * Without handling it, a sync over a book of any size throws partway through:
 * some invoices land, the rest do not, and the failure surfaces as a generic
 * "Xero failed: 429". A half-synced ledger is worse than a failed sync,
 * because the dashboard then shows an A/R total that is simply wrong and
 * nothing says so.
 *
 * Xero also distinguishes which limit was hit via `X-Rate-Limit-Problem`
 * (minute / daily / concurrent). A daily exhaustion cannot be waited out
 * inside a request, so that one is surfaced immediately rather than slept on.
 */
async function xeroFetch(orgId: string, path: string, init?: RequestInit) {
  const integ = await getFreshXero(orgId);
  if (!integ.tenantId) throw new Error('Xero: tenant not resolved');

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${XERO_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${integ.accessToken}`,
        Accept: 'application/json',
        'Xero-Tenant-Id': integ.tenantId,
        ...(init?.headers ?? {}),
      },
    });

    if (res.status === 429 && attempt < XERO_MAX_RETRIES) {
      const problem = (res.headers.get('X-Rate-Limit-Problem') || '').toLowerCase();
      if (problem === 'daily') {
        throw new Error(
          `Xero ${path}: daily API limit (5,000 calls) exhausted for this organisation. ` +
            'Sync will resume tomorrow; no data was partially written.',
        );
      }
      // Retry-After is in seconds. Default to 60 — the minute window — when the
      // header is absent, and cap it so a request cannot hang indefinitely.
      const retryAfter = Number(res.headers.get('Retry-After'));
      const waitMs = Math.min(
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 60_000,
        90_000,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      // 401, or 403 AuthenticationUnsuccessful, means Xero no longer accepts this
      // connection (access revoked in Xero, or the organisation was removed). Retrying
      // cannot fix it, and leaving the card on "Connected" hides it, so mark the
      // integration as errored: the card then offers Connect again.
      if (res.status === 401 || (res.status === 403 && /AuthenticationUnsuccessful/i.test(text))) {
        await db.update(integrations).set({ status: 'error', updatedAt: new Date() }).where(eq(integrations.id, integ.id));
        throw new Error('Xero no longer accepts this connection. Reconnect Xero from Integrations.');
      }
      throw new Error(`Xero ${path} failed: ${res.status} ${text}`);
    }
    return res.json();
  }
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
 * detect payments the customer made outside Mugavi.
 */
const XERO_PAGE_SIZE = 100; // Xero's fixed page size for list endpoints
/** Bounds on how much one sync reads: 5,000 contacts, 3,000 open invoices. Beyond that it says so instead of guessing. */
const MAX_CONTACT_PAGES = 50;
const MAX_INVOICE_PAGES = 30;

export async function xeroListOpenInvoices(orgId: string): Promise<{ invoices: XeroInvoice[]; truncated: boolean }> {
  // Fetch in two passes — Xero's filter syntax for OR is awkward. Open invoices
  // are read page by page; the paid pass stays at one page, because an invoice
  // that was paid or voided is found by its id instead (xeroGetInvoicesByIds).
  const open = await fetchAllPages(
    async (page) => ((await xeroFetch(orgId, `/Invoices?where=Status=="AUTHORISED"&page=${page}`)) as XeroList)?.Invoices ?? [],
    XERO_PAGE_SIZE,
    MAX_INVOICE_PAGES,
  );
  const paid = (await xeroFetch(orgId, `/Invoices?where=Status=="PAID"&page=1`)) as XeroList;
  const paidInvoices = paid?.Invoices ?? [];
  return {
    invoices: [...open.items, ...paidInvoices],
    // The open list is only truncated if it ran into the page limit. The single paid page being full is normal and is covered by the id lookup.
    truncated: open.truncated,
  };
}

/**
 * The current state of specific invoices, by id. Used for invoices we hold as
 * open that no longer appear in the open list: they were paid, voided or deleted.
 * Xero accepts a comma-separated list of ids; batches stay small to keep the URL short.
 */
export async function xeroGetInvoicesByIds(orgId: string, ids: string[]): Promise<XeroInvoice[]> {
  const out: XeroInvoice[] = [];
  for (const batch of chunk(ids, 40)) {
    const res = (await xeroFetch(orgId, `/Invoices?IDs=${batch.map(encodeURIComponent).join(',')}`)) as XeroList;
    out.push(...(res?.Invoices ?? []));
  }
  return out;
}

/**
 * Credit notes that still have credit left (status AUTHORISED). A credit note is
 * money the customer is owed until it is applied to an invoice or refunded.
 */
type XeroCreditNote = { CreditNoteID?: string; Status?: string; RemainingCredit?: number; CurrencyCode?: string; Contact?: { ContactID?: string } };
const MAX_CREDIT_PAGES = 20;
export async function xeroListCredits(orgId: string): Promise<{ credits: Array<{ customerExternalId: string; currency: string; amount: number }>; truncated: boolean }> {
  const all = await fetchAllPages(
    async (page) => ((await xeroFetch(orgId, `/CreditNotes?where=Status=="AUTHORISED"&page=${page}`)) as { CreditNotes?: XeroCreditNote[] })?.CreditNotes ?? [],
    XERO_PAGE_SIZE,
    MAX_CREDIT_PAGES,
  );
  const credits = all.items
    .filter((c: XeroCreditNote) => Number(c.RemainingCredit ?? 0) > 0 && c.Contact?.ContactID)
    .map((c: XeroCreditNote) => ({ customerExternalId: String(c.Contact!.ContactID), currency: String(c.CurrencyCode ?? 'USD'), amount: Number(c.RemainingCredit) }));
  return { credits, truncated: all.truncated };
}

/** List all contacts (customers) from Xero, every page. */
export async function xeroListContacts(orgId: string): Promise<{ contacts: XeroContact[]; truncated: boolean }> {
  const all = await fetchAllPages(
    async (page) => ((await xeroFetch(orgId, `/Contacts?page=${page}`)) as XeroList)?.Contacts ?? [],
    XERO_PAGE_SIZE,
    MAX_CONTACT_PAGES,
  );
  return { contacts: all.items, truncated: all.truncated };
}

// -------------------------------------------------------------------
// Write APIs
// -------------------------------------------------------------------

/**
 * Create a Payment in Xero and allocate it to the given invoice.
 * This is how we push a Mugavi-collected payment back to the
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
  const body: Record<string, unknown> = {
    Invoice: { InvoiceID: opts.xeroInvoiceId },
    Account: opts.accountCode ? { Code: opts.accountCode } : { Code: '200' }, // 200 = "Accounts Receivable" default
    Amount: opts.amount,
    CurrencyRate: 1, // For single-currency orgs; multi-currency needs lookup
    Reference: `Mugavi ${opts.reference}`,
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
  /** True if the sync stopped at its page limit (5,000 contacts or 3,000 open invoices), so something may be missing. */
  truncated?: boolean;
}

export async function syncXeroForOrg(orgId: string): Promise<XeroSyncResult> {
  const t0 = Date.now();
  const errors: string[] = [];
  let customersUpserted = 0;
  let invoicesUpserted = 0;
  let invoicesMarkedPaid = 0;
  let reconciledByLookup = 0;
  let truncated = false;

  // 1. Contacts → customers
  let xeroContacts: XeroContact[] = [];
  try {
    const res = await xeroListContacts(orgId);
    xeroContacts = res.contacts;
    if (res.truncated) truncated = true;
  } catch (e: unknown) {
    errors.push(`contacts: ${errorMessage(e)}`);
  }

  for (const c of xeroContacts) {
    try {
      const externalId = String(c.ContactID);
      const name = c.Name ?? (`${c.FirstName ?? ''} ${c.LastName ?? ''}`.trim() || 'Unknown');
      const email = c.EmailAddress ?? null;
      const phone = (c.Phones ?? []).find((p: XeroPhone) => p.PhoneType === 'MOBILE' || p.PhoneType === 'DEFAULT')?.PhoneNumber ?? null;
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
    } catch (e: unknown) {
      errors.push(`contact ${c?.ContactID}: ${errorMessage(e)}`);
    }
  }

  // 2. Invoices
  let xeroInvoices: XeroInvoice[] = [];
  try {
    const res = await xeroListOpenInvoices(orgId);
    xeroInvoices = res.invoices;
    if (res.truncated) truncated = true;
  } catch (e: unknown) {
    errors.push(`invoices: ${errorMessage(e)}`);
  }

  const applyInvoice = async (inv: XeroInvoice): Promise<void> => {
    try {
      const externalId = String(inv.InvoiceID);
      const contactExternalId = String(inv.Contact?.ContactID ?? '');
      if (!contactExternalId) return;

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
      // Xero's own Status (VOIDED, DELETED, DRAFT) wins over the amounts, and an
      // owner's dispute or write-off survives while the invoice is still open there.
      const syncedStatus = xeroSyncedStatus({ xeroStatus: inv.Status, total, due: amountDue, dueDate, now: new Date() });
      // A voided or draft invoice was never paid: do not let total minus nothing-due read as money received.
      const effectivePaid = syncedStatus === 'written_off' || syncedStatus === 'draft' ? 0 : amountPaid;

      const existing = await db
        .select({ id: invoicesTbl.id, status: invoicesTbl.status, paidAt: invoicesTbl.paidAt })
        .from(invoicesTbl)
        .where(and(eq(invoicesTbl.orgId, orgId), eq(invoicesTbl.externalId, externalId)))
        .limit(1);

      if (existing[0]) {
        const status = reconcileStatus(existing[0].status, syncedStatus);
        const wasUnpaid = existing[0].status !== 'paid';
        // See quickbooks.ts — paidAt must not be re-stamped on every sync or
        // DSO inflates by a day per day. Preserve the original payment date.
        const preservedPaidAt = status === 'paid' ? (existing[0].paidAt ?? new Date()) : null;
        await db.update(invoicesTbl).set({
          number,
          amount: String(total),
          amountPaid: String(effectivePaid),
          currency,
          issueDate,
          dueDate,
          status,
          paidAt: preservedPaidAt,
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
          amountPaid: String(effectivePaid),
          currency,
          issueDate,
          dueDate,
          status,
          paidAt: status === 'paid' ? new Date() : null,
        });
      }
      invoicesUpserted++;
    } catch (e: unknown) {
      errors.push(`invoice ${inv?.InvoiceID}: ${errorMessage(e)}`);
    }
  };

  for (const inv of xeroInvoices) await applyInvoice(inv);

  // 3. Invoices we hold as open that Xero did not list as open: paid, voided or
  // deleted there. Ask Xero about each by id and apply what it says, so a paid
  // invoice stops being chased even when it is not on the one paid page we read.
  // A failure here is reported but never undoes what was synced above.
  try {
    const seen = new Set(xeroInvoices.map((i) => String(i.InvoiceID)));
    const held = await db
      .select({ externalId: invoicesTbl.externalId, status: invoicesTbl.status })
      .from(invoicesTbl)
      .where(and(eq(invoicesTbl.orgId, orgId), inArray(invoicesTbl.status, ['sent', 'viewed', 'partial', 'overdue', 'disputed'])));
    const missing = held
      .filter((h: { externalId: string | null; status: string }) => h.externalId && needsLookup(h.status) && !seen.has(h.externalId))
      .map((h: { externalId: string | null }) => h.externalId as string);
    if (missing.length > 0) {
      for (const inv of await xeroGetInvoicesByIds(orgId, missing)) {
        await applyInvoice(inv);
        reconciledByLookup++;
      }
    }
  } catch (e: unknown) {
    errors.push(`reconcile: ${errorMessage(e)}`);
  }


  // 3. Unapplied credit, so reminders stop for a customer the owner owes credit to.
  // Only stored when it was read in full: a failed or cut-off read must not erase
  // real credit and start the chasing again.
  try {
    const found = await xeroListCredits(orgId);
    if (!found.truncated) await replaceCredits(orgId, found.credits);
    else errors.push('credit notes: too many to read in one sync, so credit was left as it was');
  } catch (e: unknown) {
    errors.push(`credit notes: ${errorMessage(e)}`);
  }

  await db.update(integrations).set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'xero')));

  if (truncated) errors.push(`sync stopped at the limit of ${MAX_CONTACT_PAGES * XERO_PAGE_SIZE} contacts or ${MAX_INVOICE_PAGES * XERO_PAGE_SIZE} open invoices, so some may not have been imported`);
  return { customersUpserted, invoicesUpserted, invoicesMarkedPaid, durationMs: Date.now() - t0, errors, truncated };
}
