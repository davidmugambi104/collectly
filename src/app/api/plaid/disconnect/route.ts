import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { disconnectPlaid } from '@/lib/integrations/plaid';

/**
 * POST /api/plaid/disconnect
 * Mirrors DELETE /api/integrations/sync?provider=... for QBO/Xero/Square —
 * Plaid gets its own route since it's not one of the sync-capable
 * accounting providers that route handles.
 */
export async function POST() {
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    await disconnectPlaid(orgId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
