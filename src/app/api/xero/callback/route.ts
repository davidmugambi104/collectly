import { NextRequest, NextResponse } from 'next/server';
import { xeroExchangeCode, saveXeroConnection } from '@/lib/integrations/xero';
import { getAuth } from '@/lib/auth-helper';
import { consumeOAuthState } from '@/lib/oauth-state';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // server-bound nonce (see oauth-state.ts)
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/integrations?err=xero&reason=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.json({ error: 'missing code or state' }, { status: 400 });
  }

  // SECURITY (audit C-1): verify the server-bound state before binding tokens.
  const session = await getAuth();
  if (!session?.orgId || !session?.userId) {
    return NextResponse.redirect(new URL('/dashboard/integrations?err=xero&reason=invalid_state', req.url));
  }
  const consumed = await consumeOAuthState(state, { orgId: session.orgId, userId: session.userId }, 'xero');
  if (!consumed.ok) {
    return NextResponse.redirect(new URL(`/dashboard/integrations?err=xero&reason=${encodeURIComponent(consumed.reason)}`, req.url));
  }

  try {
    const tokens = await xeroExchangeCode(code);
    // Xero requires a follow-up call to get the tenant id; if we don't have it yet,
    // we'll save what we have and resolve the tenant on first sync.
    await saveXeroConnection(consumed.orgId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      tenant_id: tokens.xero_tenant_id ?? tokens.tenant_id,
    });
    return NextResponse.redirect(new URL(`/dashboard/integrations?ok=xero`, req.url));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}