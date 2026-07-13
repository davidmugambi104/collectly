/**
 * QuickBooks Online integration — token exchange + report fetch.
 * Docs: https://developer.intuit.com/app/developer/qbo/docs/develop
 */
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

const QBO_BASE = process.env.QBO_ENVIRONMENT === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com';

const QBO_OAUTH = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

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

export async function qboFetchAgingReport(orgId: string) {
  const [integ] = await db.select().from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'quickbooks'))).limit(1);
  if (!integ?.accessToken || !integ.realmId) throw new Error('QuickBooks not connected');

  const query = `SELECT * FROM AgeingReport MAXRESULTS 1000`;
  const url = `${QBO_BASE}/v3/company/${integ.realmId}/reports/AgedReceivables?${new URLSearchParams({ query }).toString()}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${integ.accessToken}`, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`QBO report failed: ${res.status}`);
  return res.json();
}

export async function qboListInvoices(orgId: string) {
  const [integ] = await db.select().from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'quickbooks'))).limit(1);
  if (!integ?.accessToken || !integ.realmId) throw new Error('QuickBooks not connected');
  const query = `SELECT Id, DocNumber, CustomerRef, TotalAmount, Balance, DueDate, TxnDate, CurrencyRef FROM Invoice WHERE Balance > '0' MAXRESULTS 1000`;
  const url = `${QBO_BASE}/v3/company/${integ.realmId}/query?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${integ.accessToken}`, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`QBO invoice list failed: ${res.status}`);
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
