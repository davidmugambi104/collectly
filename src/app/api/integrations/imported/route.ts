import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { previewImportedData, purgeImportedData } from '@/lib/integrations/imported-data-db';
import { describeImported, parseImportProvider, PROVIDER_LABEL, type ImportProvider } from '@/lib/integrations/imported-data';
import { isWorkspaceOwnerOrAdmin } from '@/lib/org-role-load';
import { recordEvent } from '@/lib/events';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function isConnected(orgId: string, provider: ImportProvider): Promise<boolean> {
  const [row] = await db.select({ status: integrations.status }).from(integrations).where(and(eq(integrations.orgId, orgId), eq(integrations.provider, provider))).limit(1);
  return row?.status === 'connected';
}

/** GET ?provider=xero|quickbooks (default xero): what a sync of that provider left in this organization. Changes nothing. */
export async function GET(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const provider = parseImportProvider(req.nextUrl.searchParams.get('provider') ?? 'xero');
  if (!provider) return NextResponse.json({ error: 'provider must be xero or quickbooks' }, { status: 400 });
  const summary = await previewImportedData(orgId, provider);
  console.info('[imported] count', { provider, orgTail: orgId.slice(-6), invoices: summary.invoices, customers: summary.customers });
  return NextResponse.json({ provider, ...summary, connected: await isConnected(orgId, provider), message: describeImported(summary, provider) });
}

/**
 * DELETE { provider, expect: { invoices, customers } }: remove it. Preview first: `expect` must equal what a fresh
 * preview finds right now, or nothing is deleted (409). Owner or admin only. Refused while the provider is still
 * connected, because the next sync would only bring it back. Only this organization's rows whose ids are in that
 * provider's format (QuickBooks: digits only; Xero: GUIDs); nothing typed in by hand or from the other provider.
 */
export async function DELETE(req: NextRequest) {
  await ensureBootstrapped();
  const a = await getAuth() as { userId?: string | null; orgId?: string | null; orgRole?: string | null };
  if (!a.orgId || !a.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isWorkspaceOwnerOrAdmin({ userId: a.userId, orgId: a.orgId, orgRole: a.orgRole }))) {
    return NextResponse.json({ error: 'Only the workspace owner or an admin can remove imported data.' }, { status: 403 });
  }
  let body: { provider?: unknown; expect?: { invoices?: unknown; customers?: unknown } } = {};
  try { const p = await req.json(); if (p && typeof p === 'object') body = p; } catch { /* handled below */ }
  const provider = parseImportProvider(body.provider);
  if (!provider) return NextResponse.json({ error: 'provider must be xero or quickbooks' }, { status: 400 });
  if (typeof body.expect?.invoices !== 'number' || typeof body.expect?.customers !== 'number') {
    return NextResponse.json({ error: 'expect the counts from the preview' }, { status: 400 });
  }
  if (await isConnected(a.orgId, provider)) {
    return NextResponse.json({ error: `${PROVIDER_LABEL[provider]} is still connected. Disconnect it first, or the next sync brings the data back.` }, { status: 409 });
  }
  const now = await previewImportedData(a.orgId, provider);
  if (now.invoices !== body.expect.invoices || now.customers !== body.expect.customers) {
    return NextResponse.json({ error: 'The data changed since the preview. Look again before removing.', now }, { status: 409 });
  }
  const removed = await purgeImportedData(a.orgId, provider);
  await recordEvent({ orgId: a.orgId, type: 'data.imported_removed', payload: { provider, ...removed }, actorId: a.userId });
  return NextResponse.json({ ok: true, removed });
}
