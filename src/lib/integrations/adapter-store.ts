/**
 * The database side of runSync (adapter.ts), plus saveAdapterConnection for a provider's OAuth callback.
 * Every query is scoped to one organization.
 */
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { customers, invoices, integrations, timelineEvents } from '@/db/schema';
import { ensureIntegrationProviderSchema } from '@/lib/integrations/provider-enum';
import { PROVIDER_ID_PATTERN } from '@/lib/integrations/imported-data';
import { replaceCredits } from '@/lib/integrations/credits';
import { nanoid } from '@/lib/utils';
import type { SyncStore, ProviderId, ExistingCustomer, ExistingInvoice } from '@/lib/integrations/adapter';

export const dbSyncStore: SyncStore = {
  async loadExisting(orgId, provider) {
    const pattern = PROVIDER_ID_PATTERN[provider];
    const cs: Array<ExistingCustomer & { externalId: string | null }> = await db
      .select({ id: customers.id, externalId: customers.externalId, name: customers.name, email: customers.email, phone: customers.phone, company: customers.company })
      .from(customers).where(and(eq(customers.orgId, orgId), sql`${customers.externalId} ~* ${pattern}`));
    const is: Array<ExistingInvoice & { externalId: string | null }> = await db
      .select({
        id: invoices.id, customerId: invoices.customerId, externalId: invoices.externalId, number: invoices.number, status: invoices.status,
        amount: invoices.amount, amountPaid: invoices.amountPaid, currency: invoices.currency, issueDate: invoices.issueDate, dueDate: invoices.dueDate, paidAt: invoices.paidAt,
      })
      .from(invoices).where(and(eq(invoices.orgId, orgId), sql`${invoices.externalId} ~* ${pattern}`));
    return {
      customers: new Map(cs.filter((c) => c.externalId).map((c) => [c.externalId as string, c])),
      invoices: new Map(is.filter((i) => i.externalId).map((i) => [i.externalId as string, { ...i, externalId: i.externalId as string }])),
    };
  },
  async insertCustomers(orgId, rows) {
    if (rows.length) await db.insert(customers).values(rows.map((r) => ({ ...r, orgId })));
  },
  async updateCustomer(id, set) {
    await db.update(customers).set({ ...set, updatedAt: new Date() }).where(eq(customers.id, id));
  },
  async insertInvoices(orgId, rows) {
    if (rows.length) await db.insert(invoices).values(rows.map((r) => ({ ...r, orgId })));
  },
  async updateInvoice(id, set) {
    await db.update(invoices).set({ ...set, updatedAt: new Date() }).where(eq(invoices.id, id));
  },
  async recordClosed(orgId, row) {
    await db.insert(timelineEvents).values({
      id: nanoid(), orgId, customerId: row.customerId, invoiceId: row.invoiceId, eventType: 'invoice_closed',
      title: `Invoice ${row.number} was ${row.closure} in ${row.providerLabel}`,
      description: 'Marked written off so no more reminders go out. Reopen it if this was a mistake.',
    });
  },
  replaceCredits,
  async touchLastSync(orgId, provider) {
    await db.update(integrations).set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, provider)));
  },
};

/**
 * Create or refresh the integrations row after a successful OAuth callback. Widens the Postgres enum first.
 * Tokens are encrypted by the column type. Returns the row id.
 */
export async function saveAdapterConnection(orgId: string, provider: ProviderId, data: {
  accessToken: string; refreshToken?: string | null; expiresIn?: number | null; realmId?: string | null; tenantId?: string | null; metadata?: Record<string, unknown> | null;
}): Promise<string> {
  await ensureIntegrationProviderSchema();
  const expiresAt = data.expiresIn ? new Date(Date.now() + data.expiresIn * 1000) : null;
  const values = {
    status: 'connected' as const, accessToken: data.accessToken, refreshToken: data.refreshToken ?? null, expiresAt,
    realmId: data.realmId ?? null, tenantId: data.tenantId ?? null, metadata: data.metadata ?? null, lastSyncAt: new Date(), updatedAt: new Date(),
  };
  const [have] = await db.select({ id: integrations.id }).from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, provider))).limit(1);
  if (have) {
    await db.update(integrations).set(values).where(eq(integrations.id, have.id));
    return have.id;
  }
  const [row] = await db.insert(integrations).values({ id: nanoid(), orgId, provider, ...values }).returning();
  return row.id;
}

/** Delete the integrations row (the last step of an adapter's disconnect). Idempotent. */
export async function deleteAdapterConnection(orgId: string, provider: ProviderId): Promise<void> {
  await db.delete(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, provider)));
}

/** The stored connection, or null. For an adapter's list calls to read tokens from. */
export async function getAdapterConnection(orgId: string, provider: ProviderId) {
  const [row] = await db.select().from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, provider))).limit(1);
  return row ?? null;
}

