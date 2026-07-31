import { NextRequest, NextResponse } from 'next/server';
import { qboExchangeCode, saveQboConnection } from '@/lib/integrations/quickbooks';
import { getAuth } from '@/lib/auth-helper';
import { consumeOAuthState } from '@/lib/oauth-state';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const realmId = url.searchParams.get('realmId');
  const state = url.searchParams.get('state'); // server-bound nonce (see oauth-state.ts)
  const error = url.searchParams.get('error');
  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/integrations?err=quickbooks&reason=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !realmId || !state) return NextResponse.json({ error: 'missing params' }, { status: 400 });

  // SECURITY (audit C-1): never trust `state` as a raw orgId. Consume the
  // server-bound binding first; forged/stale/expired states must not
  // bind tokens to an org.
  const session = await getAuth();
  if (!session?.orgId || !session?.userId) {
    return NextResponse.redirect(new URL('/dashboard/integrations?err=quickbooks&reason=invalid_state', req.url));
  }
  const consumed = await consumeOAuthState(state, { orgId: session.orgId, userId: session.userId });
  if (!consumed.ok) {
    return NextResponse.redirect(new URL(`/dashboard/integrations?err=quickbooks&reason=${encodeURIComponent(consumed.reason)}`, req.url));
  }

  try {
    const tokens = await qboExchangeCode(code, realmId);
    await saveQboConnection(consumed.orgId, { ...tokens, realmId });
    return NextResponse.redirect(new URL(`/dashboard/integrations?ok=quickbooks`, req.url));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}