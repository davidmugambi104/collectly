import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { syncQboForOrg, disconnectQbo } from '@/lib/integrations/quickbooks';
import { syncXeroForOrg, disconnectXero } from '@/lib/integrations/xero';
import { syncSquareForOrg, disconnectSquare } from '@/lib/integrations/square';

export const dynamic = 'force-dynamic';
// syncXeroForOrg/syncQboForOrg do sequential, unbatched per-row DB upserts on
// top of the provider API calls -- easily exceeds Vercel's low default
// function timeout (10s) for a real org, producing a bare 502 with no
// application-level error (the function is killed before our own try/catch
// can log or respond). This is a real observed failure, not speculative.
export const maxDuration = 60;

async function getConnectedProvider(orgId: string, provider: 'quickbooks' | 'xero' | 'square') {
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
export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const provider = body?.provider as string | undefined;
  if (provider !== 'quickbooks' && provider !== 'xero' && provider !== 'square') {
    return NextResponse.json({ error: 'invalid provider' }, { status: 400 });
  }

  const integ = await getConnectedProvider(orgId, provider);
  if (!integ || integ.status !== 'connected') {
    return NextResponse.json({ error: `${provider} not connected` }, { status: 400 });
  }

  try {
    const result = provider === 'quickbooks'
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
    if (topLevelFailed && result.customersUpserted === 0 && result.invoicesUpserted === 0) {
      return NextResponse.json(
        { ok: false, provider, error: 'sync failed', details: result.errors, ...result },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, provider, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 502 });
  }
}

/**
 * DELETE /api/integrations/sync?provider=quickbooks|xero|square
 * Disconnects the integration: revokes tokens and deletes the row.
 */
export async function DELETE(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const provider = new URL(req.url).searchParams.get('provider');
  if (provider !== 'quickbooks' && provider !== 'xero' && provider !== 'square') {
    return NextResponse.json({ error: 'invalid provider' }, { status: 400 });
  }

  try {
    if (provider === 'quickbooks') await disconnectQbo(orgId);
    else if (provider === 'xero') await disconnectXero(orgId);
    else await disconnectSquare(orgId);
    return NextResponse.json({ ok: true, provider });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
