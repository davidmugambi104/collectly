import { NextRequest, NextResponse } from 'next/server';
import { xeroExchangeCode, saveXeroConnection } from '@/lib/integrations/xero';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // orgId
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/integrations?err=xero&reason=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.json({ error: 'missing code or state' }, { status: 400 });
  }
  try {
    const tokens = await xeroExchangeCode(code);
    // Xero requires a follow-up call to get the tenant id; if we don't have it yet,
    // we'll save what we have and resolve the tenant on first sync.
    await saveXeroConnection(state, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      tenant_id: tokens.xero_tenant_id ?? tokens.tenant_id,
    });
    return NextResponse.redirect(new URL(`/dashboard/integrations?ok=xero`, req.url));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
