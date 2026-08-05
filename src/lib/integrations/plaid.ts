/**
 * Plaid integration — Link token + public_token exchange.
 * Docs: https://plaid.com/docs/link/
 *
 * Plaid Link runs client-side (Plaid's official JS widget) and returns a
 * `public_token`. The client then POSTs that token to /api/plaid/exchange,
 * which exchanges it for a long-lived `access_token` and stores it.
 */
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

const PLAID_BASE = process.env.PLAID_ENV === 'production'
  ? 'https://production.plaid.com'
  : 'https://sandbox.plaid.com';

interface PlaidTokens {
  access_token: string;
  item_id: string;
  request_id: string;
}

async function plaidPost<T = any>(path: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(`${PLAID_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Plaid ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function plaidCreateLinkToken(orgId: string) {
  return plaidPost('/link/token/create', {
    user: { client_user_id: orgId },
    client_name: 'Collectly',
    products: ['auth', 'transactions'],
    country_codes: ['US', 'CA', 'GB'],
    language: 'en',
    webhook: process.env.PLAID_WEBHOOK_URL,
  });
}

export async function plaidExchangePublicToken(publicToken: string): Promise<PlaidTokens> {
  return plaidPost<PlaidTokens>('/item/public_token/exchange', { public_token: publicToken });
}

/**
 * Disconnect: revokes the item on Plaid's side (this is a real bank
 * credential — best-effort revoke matters more here than for e.g. Square)
 * then removes the local row. Mirrors disconnectSquare()/disconnectQbo()/
 * disconnectXero() in the sibling files. Previously had no counterpart at
 * all — once connected, Plaid could never be disconnected from the app;
 * the "Manage" button was permanently disabled once `connected` was true.
 */
export async function disconnectPlaid(orgId: string) {
  const [integ] = await db.select().from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'plaid'))).limit(1);
  if (!integ) return { ok: true };
  if (integ.accessToken) {
    try {
      await plaidPost('/item/remove', { access_token: integ.accessToken });
    } catch {
      // best-effort; we still want to delete the local row so the org can
      // reconnect (a fresh Link flow creates a new item regardless).
    }
  }
  await db.delete(integrations).where(eq(integrations.id, integ.id));
  return { ok: true };
}

export async function savePlaidConnection(orgId: string, tokens: PlaidTokens) {
  const existing = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, 'plaid')))
    .limit(1);
  if (existing[0]) {
    await db
      .update(integrations)
      .set({
        accessToken: tokens.access_token,
        status: 'connected',
        metadata: { item_id: tokens.item_id, request_id: tokens.request_id },
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
      provider: 'plaid',
      status: 'connected',
      accessToken: tokens.access_token,
      metadata: { item_id: tokens.item_id, request_id: tokens.request_id },
      lastSyncAt: new Date(),
    })
    .returning();
  return row.id;
}
