import { noStore } from '@/lib/no-store';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { syncQboForOrg, disconnectQbo, QboReconnectRequiredError, getQboReconnectUrl } from '@/lib/integrations/quickbooks';
import { previewImportedData } from '@/lib/integrations/imported-data-db';
import { sql } from 'drizzle-orm';
import { syncXeroForOrg, disconnectXero, XeroReconnectRequiredError, getXeroReconnectUrl } from '@/lib/integrations/xero';
import { recordFunnelEvent } from '@/lib/funnel-events';
import { syncSquareForOrg, disconnectSquare } from '@/lib/integrations/square';
import { getAdapter } from '@/lib/integrations/adapters';
import { runSync, type ProviderId } from '@/lib/integrations/adapter';
import { recordSyncSummary, type AccountingProvider } from '@/lib/integrations/connection-health-db';

export const dynamic = 'force-dynamic';
// syncXeroForOrg/syncQboForOrg do sequential, unbatched per-row DB upserts on
// top of the provider API calls -- easily exceeds Vercel's low default
// function timeout (10s) for a real org, producing a bare 502 with no
// application-level error (the function is killed before our own try/catch
// can log or respond). This is a real observed failure, not speculative.
export const maxDuration = 60;

async function getConnectedProvider(orgId: string, provider: 'quickbooks' | 'xero' | 'square' | ProviderId) {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, provider)))
    .limit(1);
  return row ?? null;
}

/**
 * POST /api/integrations/sync
 * Body: { provider: "quickbooks" | "xero" | "square" }
 * Pulls invoices + customers from the connected accounting/payments system
 * and upserts them into our DB. Returns counts and any per-row errors.
 */
async function postHandler(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId, userId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const provider = body?.provider as string | undefined;
  // Xero, QuickBooks and Square keep their own sync code. Every other provider goes through its registered adapter and runSync.
  const adapter = provider && provider !== 'csv' ? getAdapter(provider) : null;
  if (provider !== 'quickbooks' && provider !== 'xero' && provider !== 'square' && !adapter) {
    return NextResponse.json({ error: 'invalid provider' }, { status: 400 });
  }

  const integ = await getConnectedProvider(orgId, provider as 'quickbooks' | 'xero' | 'square' | ProviderId);
  if (!integ || integ.status !== 'connected') {
    return NextResponse.json({ error: `${provider} not connected` }, { status: 400 });
  }

  try {
    const result = adapter
      ? await runSync(adapter, orgId)
      : provider === 'quickbooks'
      ? await syncQboForOrg(orgId)
      : provider === 'xero'
        ? await syncXeroForOrg(orgId)
        : await syncSquareForOrg(orgId);
    // If the provider itself threw (refresh failed, network error),
    // syncQboForOrg would have thrown too — we wouldn't be here.
    // But if ALL customers + invoices failed and there were per-row errors
    // AND the top-level calls errored, treat it as a hard failure.
    const topLevelFailed = result.errors.some((e: string) =>
      e.startsWith('customers:') || e.startsWith('contacts:') || e.startsWith('invoices:'),
    );
    // Persisted so the card can show it after a reload, not only in the
    // transient message under the Sync button -- including a partial failure
    // like `customers:` or `credit:` errors, which used to vanish on refresh.
    if (provider === 'quickbooks' || provider === 'xero') {
      await recordSyncSummary(orgId, provider as AccountingProvider, {
        at: new Date().toISOString(),
        ok: !(topLevelFailed && result.customersUpserted === 0 && result.invoicesUpserted === 0),
        customersUpserted: result.customersUpserted,
        invoicesUpserted: result.invoicesUpserted,
        invoicesMarkedPaid: result.invoicesMarkedPaid,
        truncated: result.truncated,
        errors: result.errors.slice(0, 5),
      }).catch(() => { /* the summary is a convenience; never fail the sync over it */ });
    }
    if (topLevelFailed && result.customersUpserted === 0 && result.invoicesUpserted === 0) {
      return NextResponse.json(
        { ok: false, provider, error: 'sync failed', details: result.errors, ...result },
        { status: 502 },
      );
    }
    await recordFunnelEvent(orgId, 'integration.synced', userId ?? undefined, {
      provider: provider as 'quickbooks' | 'xero' | 'square' | ProviderId,
      customers: result.customersUpserted,
      invoices: result.invoicesUpserted,
      rowErrors: result.errors.length,
      hadInvoices: result.invoicesUpserted > 0,
    });
    // Read back what is stored for this organisation, next to what the sync reported. Counts only; the org is
    // identified by its last six characters. Added to find why a sync that reports rows can leave none visible.
    let stored: { invoices: number; customers: number } | null = null;
    if (provider === 'quickbooks' || provider === 'xero') {
      try {
        const s = await previewImportedData(orgId, provider);
        stored = { invoices: s.invoices, customers: s.customers };
      } catch { /* the check is only a diagnostic */ }
      // Where did QuickBooks-format invoices end up, across every organisation? Counts per last-six-characters only.
      let acrossOrgs: unknown = null;
      try {
        const r: unknown = await db.execute(sql`select right(org_id, 6) as org_tail, count(*)::int as n from invoices where external_id ~ '^[0-9]{1,18}$' group by 1`);
        acrossOrgs = (r as { rows?: unknown[] })?.rows ?? r;
      } catch { /* diagnostic only */ }
      console.info('[sync] stored', { provider, orgTail: orgId.slice(-6), reported: { customers: result.customersUpserted, invoices: result.invoicesUpserted }, stored, acrossOrgs });
    }
    return NextResponse.json({ ok: true, provider, ...result, stored });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    // A dead refresh token or a revoked connection: no amount of retrying this
    // request fixes it, so the client gets a reconnect link up front instead of
    // a generic "sync failed" it would otherwise show next to the Sync button.
    const reconnectRequired = e instanceof QboReconnectRequiredError || e instanceof XeroReconnectRequiredError;
    const reconnectHref = e instanceof QboReconnectRequiredError
      ? getQboReconnectUrl(orgId)
      : e instanceof XeroReconnectRequiredError
        ? getXeroReconnectUrl(orgId)
        : undefined;
    if (provider === 'quickbooks' || provider === 'xero') {
      await recordSyncSummary(orgId, provider as AccountingProvider, {
        at: new Date().toISOString(),
        ok: false,
        errors: [],
        failureMessage: reconnectRequired ? `${provider === 'quickbooks' ? 'QuickBooks' : 'Xero'} needs to be reconnected.` : message,
      }).catch(() => { /* the summary is a convenience; never mask the real error over it */ });
    }
    return NextResponse.json(
      { error: reconnectRequired ? `${provider === 'quickbooks' ? 'QuickBooks' : 'Xero'} needs to be reconnected.` : message, reconnectRequired, reconnectHref },
      { status: reconnectRequired ? 409 : 502 },
    );
  }
}

/**
 * DELETE /api/integrations/sync?provider=quickbooks|xero|square
 * Disconnects the integration: revokes tokens and deletes the row.
 */
async function deleteHandler(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const provider = new URL(req.url).searchParams.get('provider');
  const adapter = provider && provider !== 'csv' ? getAdapter(provider) : null;
  if (provider !== 'quickbooks' && provider !== 'xero' && provider !== 'square' && !adapter) {
    return NextResponse.json({ error: 'invalid provider' }, { status: 400 });
  }

  try {
    let revokeFailed = false;
    if (adapter) await adapter.disconnect(orgId);
    else if (provider === 'quickbooks') revokeFailed = (await disconnectQbo(orgId)).revokeFailed;
    else if (provider === 'xero') revokeFailed = (await disconnectXero(orgId)).revokeFailed;
    else await disconnectSquare(orgId);
    // revokeFailed: removed here, but the provider did not confirm it removed our access.
    return NextResponse.json({ ok: true, provider, revokeFailed });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return noStore(await postHandler(req));
}

export async function DELETE(req: NextRequest) {
  return noStore(await deleteHandler(req));
}
