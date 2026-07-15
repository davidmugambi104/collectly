/**
 * Xero integration — OAuth 2.0 + invoice list
 * Docs: https://developer.xero.com/documentation/guides/oauth2
 */
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

const XERO_OAUTH = 'https://identity.xero.com/connect/token';
const XERO_API = 'https://api.xero.com/api.xro/2.0';

export function xeroAuthUrl(state: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.XERO_CLIENT_ID ?? '',
    redirect_uri: process.env.XERO_REDIRECT_URI ?? '',
    scope: 'openid profile email accounting.transactions accounting.contacts offline_access',
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

