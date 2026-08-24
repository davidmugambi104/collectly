/**
 * Square OAuth 2.0 (with PKCE) — Authorization Code flow.
 * Docs: https://developer.squareup.com/docs/oauth-api/overview
 *
 * Square requires PKCE. We use the S256 method (challenge = base64url(sha256(verifier))).
 * The verifier is stored server-side keyed by the `state` parameter (orgId) so the
 * callback can look it up.
 */
import crypto from 'node:crypto';
import { db } from '@/db';
import { integrations, customers as customersTbl, invoices as invoicesTbl } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

const SQUARE_OAUTH = 'https://connect.squareup.com/oauth2/authorize';
const SQUARE_TOKEN = 'https://connect.squareup.com/oauth2/token';
const SQUARE_SANDBOX_OAUTH = 'https://connect.squareupsandbox.com/oauth2/authorize';
const SQUARE_SANDBOX_TOKEN = 'https://connect.squareupsandbox.com/oauth2/token';

const SANDBOX = process.env.SQUARE_ENVIRONMENT === 'sandbox';

// Minimal shapes for the fields this file actually reads/writes -- Square's
// official SDK types are far broader than what we use here.
interface SquareTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_at: string;
}
interface SquareLocation {
  id: string;
  status?: string;
}
interface SquareCustomer {
  id: string;
  company_name?: string;
  given_name?: string;
  family_name?: string;
  email_address?: string | null;
  phone_number?: string | null;
}
interface SquareMoney {
  amount?: number;
  currency?: string;
}
interface SquarePaymentRequest {
  computed_amount_money?: SquareMoney;
  total_completed_amount_money?: SquareMoney;
  due_date?: string;
}
interface SquareInvoiceRecipient {
  customer_id?: string;
  company_name?: string;
  given_name?: string;
  family_name?: string;
  email_address?: string | null;
  phone_number?: string | null;
}
interface SquareInvoice {
  id: string;
  status?: string;
  invoice_number?: string;
  created_at?: string;
  primary_recipient?: SquareInvoiceRecipient;
  payment_requests?: SquarePaymentRequest[];
}

function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function squareAuthUrl(state: string) {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  // Stash verifier in a short-lived global keyed by state (orgId).
  // For prod: persist in DB with TTL. For dev: in-memory is fine.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  g.__squarePkce ??= new Map<string, { verifier: string; expires: number }>();
  g.__squarePkce.set(state, { verifier, expires: Date.now() + 10 * 60_000 });
  const params = new URLSearchParams({
    client_id: process.env.SQUARE_CLIENT_ID ?? '',
    scope: 'MERCHANT_PROFILE_READ ORDERS_READ ITEMS_READ PAYMENTS_READ',
    session: 'false',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: process.env.SQUARE_REDIRECT_URI ?? '',
  });
  return `${SANDBOX ? SQUARE_SANDBOX_OAUTH : SQUARE_OAUTH}?${params.toString()}`;
}

export function squareGetPkceVerifier(state: string): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  const entry = g.__squarePkce?.get(state);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    g.__squarePkce.delete(state);
    return null;
  }
  g.__squarePkce.delete(state);
  return entry.verifier;
}

export async function squareExchangeCode(code: string, verifier: string) {
  const res = await fetch(SANDBOX ? SQUARE_SANDBOX_TOKEN : SQUARE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Square-Version': '2024-10-17' },
    body: JSON.stringify({
      client_id: process.env.SQUARE_CLIENT_ID ?? '',
      client_secret: process.env.SQUARE_CLIENT_SECRET ?? '',
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: process.env.SQUARE_REDIRECT_URI ?? '',
    }),
  });
  if (!res.ok) throw new Error(`Square exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const SQUARE_API = SANDBOX ? 'https://connect.squareupsandbox.com/v2' : 'https://connect.squareup.com/v2';
const SQUARE_REVOKE = SANDBOX ? 'https://connect.squareupsandbox.com/oauth2/revoke' : 'https://connect.squareup.com/oauth2/revoke';
const SQUARE_TOKEN_URL = SANDBOX ? SQUARE_SANDBOX_TOKEN : SQUARE_TOKEN;
const SQUARE_VERSION = '2024-10-17';

export async function saveSquareConnection(orgId: string, tokens: {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  merchant_id: string;
}) {
  const expiresAt = new Date(tokens.expires_at);
  const existing = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'square')))
    .limit(1);
  if (existing[0]) {
    await db
      .update(integrations)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        realmId: tokens.merchant_id,
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
      provider: 'square',
      status: 'connected',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      realmId: tokens.merchant_id,
      lastSyncAt: new Date(),
    })
    .returning();
  return row.id;
}

// -------------------------------------------------------------------
// Token refresh + authenticated fetch
// -------------------------------------------------------------------

// Square access tokens last 30 days, so this rarely fires in practice, but
// follow the same 5-min-before-expiry refresh pattern used for QBO/Xero.
async function getFreshSquare(orgId: string) {
  const [integ] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'square')))
    .limit(1);
  if (!integ) throw new Error('Square not connected');

  const now = Date.now();
  const expiresAt = integ.expiresAt ? new Date(integ.expiresAt).getTime() : 0;
  const needsRefresh = !integ.accessToken || !integ.refreshToken || expiresAt - now < 5 * 60 * 1000;
  if (!needsRefresh) return integ;

  const res = await fetch(SQUARE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Square-Version': SQUARE_VERSION },
    body: JSON.stringify({
      client_id: process.env.SQUARE_CLIENT_ID ?? '',
      client_secret: process.env.SQUARE_CLIENT_SECRET ?? '',
      refresh_token: integ.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    await db.update(integrations).set({ status: 'error', updatedAt: new Date() }).where(eq(integrations.id, integ.id));
    throw new Error(`Square refresh failed: ${res.status} ${await res.text()}`);
  }
  const json: SquareTokenResponse = await res.json();
  const newExpiresAt = new Date(json.expires_at);
  await db.update(integrations).set({
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? integ.refreshToken,
    expiresAt: newExpiresAt,
    status: 'connected',
    updatedAt: new Date(),
  }).where(eq(integrations.id, integ.id));
  return { ...integ, accessToken: json.access_token, refreshToken: json.refresh_token ?? integ.refreshToken, expiresAt: newExpiresAt };
}

async function squareFetch(orgId: string, path: string, init?: RequestInit) {
  const integ = await getFreshSquare(orgId);
  const res = await fetch(`${SQUARE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${integ.accessToken}`,
      Accept: 'application/json',
      'Square-Version': SQUARE_VERSION,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Square ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// -------------------------------------------------------------------
// Read APIs
// -------------------------------------------------------------------

/** List active location ids for this merchant — invoices/search requires them. */
export async function squareListLocations(orgId: string): Promise<string[]> {
  const res: { locations?: SquareLocation[] } = await squareFetch(orgId, '/locations');
  return (res?.locations ?? []).filter((l) => l.status !== 'INACTIVE').map((l) => l.id);
}

/** List customers (first page — mirrors the single-page convention used for QBO/Xero). */
export async function squareListCustomers(orgId: string): Promise<SquareCustomer[]> {
  const res: { customers?: SquareCustomer[] } = await squareFetch(orgId, '/customers');
  return res?.customers ?? [];
}

/** Search invoices across all of this merchant's locations. */
export async function squareSearchInvoices(orgId: string, locationIds: string[]): Promise<SquareInvoice[]> {
  if (locationIds.length === 0) return [];
  const res: { invoices?: SquareInvoice[] } = await squareFetch(orgId, '/invoices/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { filter: { location_ids: locationIds } } }),
  });
  return res?.invoices ?? [];
}

// Square amounts are integer minor units (cents); our schema stores decimal dollars.
function minorUnitsToDecimal(amount: number | undefined) {
  return (amount ?? 0) / 100;
}

const SQUARE_STATUS_MAP: Record<string, 'draft' | 'sent' | 'partial' | 'paid'> = {
  DRAFT: 'draft',
  UNPAID: 'sent',
  SCHEDULED: 'sent',
  PARTIALLY_PAID: 'partial',
  PAID: 'paid',
  PARTIALLY_REFUNDED: 'paid',
  REFUNDED: 'paid',
};

// -------------------------------------------------------------------
// Disconnect
// -------------------------------------------------------------------

/**
 * Disconnect Square: revoke the access token (best-effort, per Square's
 * /oauth2/revoke) and delete the integration row. Mirrors quickbooks.ts's
 * disconnectQbo — revocation failures shouldn't block the local disconnect.
 */
export async function disconnectSquare(orgId: string) {
  const [integ] = await db.select().from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'square'))).limit(1);
  if (!integ) return { ok: true };
  if (integ.accessToken) {
    try {
      await fetch(SQUARE_REVOKE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Square-Version': SQUARE_VERSION,
          Authorization: `Client ${process.env.SQUARE_CLIENT_SECRET ?? ''}`,
        },
        body: JSON.stringify({ client_id: process.env.SQUARE_CLIENT_ID ?? '', access_token: integ.accessToken }),
      });
    } catch {
      // best-effort; we still want to delete the local row
    }
  }
  await db.delete(integrations).where(eq(integrations.id, integ.id));
  return { ok: true };
}

// -------------------------------------------------------------------
// Sync
// -------------------------------------------------------------------

interface SquareSyncResult {
  customersUpserted: number;
  invoicesUpserted: number;
  invoicesMarkedPaid: number;
  durationMs: number;
  errors: string[];
}

export async function syncSquareForOrg(orgId: string): Promise<SquareSyncResult> {
  const t0 = Date.now();
  const errors: string[] = [];
  let customersUpserted = 0;
  let invoicesUpserted = 0;
  let invoicesMarkedPaid = 0;

  // 1. Customers
  let squareCustomers: SquareCustomer[] = [];
  try {
    squareCustomers = await squareListCustomers(orgId);
  } catch (e: unknown) {
    errors.push(`customers: ${e instanceof Error ? e.message : String(e)}`);
  }

  for (const c of squareCustomers) {
    try {
      const externalId = String(c.id);
      const name = c.company_name || `${c.given_name ?? ''} ${c.family_name ?? ''}`.trim() || 'Unknown';
      const email = c.email_address ?? null;
      const phone = c.phone_number ?? null;
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
      errors.push(`customer ${c?.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 2. Invoices (across all active locations)
  let squareInvoices: SquareInvoice[] = [];
  try {
    const locationIds = await squareListLocations(orgId);
    squareInvoices = await squareSearchInvoices(orgId, locationIds);
  } catch (e: unknown) {
    errors.push(`invoices: ${e instanceof Error ? e.message : String(e)}`);
  }

  for (const inv of squareInvoices) {
    try {
      // CANCELED/FAILED invoices were never actually billed — skip rather
      // than upserting a zero-amount row into AR.
      if (inv.status === 'CANCELED' || inv.status === 'FAILED') continue;

      const externalId = String(inv.id);
      const contactExternalId = inv.primary_recipient?.customer_id ? String(inv.primary_recipient.customer_id) : '';
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
        const recipient = inv.primary_recipient ?? {};
        const [stub] = await db.insert(customersTbl).values({
          id: nanoid(),
          orgId,
          externalId: contactExternalId,
          name: recipient.company_name || `${recipient.given_name ?? ''} ${recipient.family_name ?? ''}`.trim() || `Square Customer ${contactExternalId}`,
          email: recipient.email_address ?? null,
          phone: recipient.phone_number ?? null,
        }).returning();
        customerId = stub.id;
        customersUpserted++;
      }

      // An invoice can have multiple payment_requests (installment plans) --
      // sum them for the true total/paid rather than only reading the first,
      // which would silently under-report installment invoices.
      const requests = inv.payment_requests ?? [];
      const total = requests.reduce((sum, r) => sum + minorUnitsToDecimal(r.computed_amount_money?.amount), 0);
      const amountPaid = requests.reduce((sum, r) => sum + minorUnitsToDecimal(r.total_completed_amount_money?.amount), 0);
      const currency = requests[0]?.computed_amount_money?.currency ?? 'USD';
      const dueDateStr = requests.find((r) => r.due_date)?.due_date;
      const dueDate = dueDateStr ? new Date(dueDateStr) : new Date(inv.created_at ?? Date.now());
      const issueDate = inv.created_at ? new Date(inv.created_at) : dueDate;
      const number = inv.invoice_number || externalId;

      const mapped = SQUARE_STATUS_MAP[inv.status as string];
      const status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' = mapped === 'sent' && new Date() > dueDate
        ? 'overdue'
        : (mapped ?? 'sent');

      const existing = await db
        .select({ id: invoicesTbl.id, status: invoicesTbl.status, paidAt: invoicesTbl.paidAt })
        .from(invoicesTbl)
        .where(and(eq(invoicesTbl.orgId, orgId), eq(invoicesTbl.externalId, externalId)))
        .limit(1);

      if (existing[0]) {
        const wasUnpaid = existing[0].status !== 'paid';
        // Preserve the original paidAt like quickbooks.ts/xero.ts do --
        // re-stamping it on every sync would inflate DSO by a day per sync.
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
    } catch (e: unknown) {
      errors.push(`invoice ${inv?.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await db.update(integrations).set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'square')));

  return { customersUpserted, invoicesUpserted, invoicesMarkedPaid, durationMs: Date.now() - t0, errors };
}
