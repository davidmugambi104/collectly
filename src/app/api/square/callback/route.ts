import { NextRequest, NextResponse } from 'next/server';
import { squareExchangeCode, squareGetPkceVerifier, saveSquareConnection } from '@/lib/integrations/square';
import { getAuth } from '@/lib/auth-helper';
import { consumeOAuthState } from '@/lib/oauth-state';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // server-bound nonce (see oauth-state.ts)
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/integrations?err=square&reason=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.json({ error: 'missing code or state' }, { status: 400 });
  }

  // SECURITY (audit C-1 follow-up): never trust `state` as a raw orgId.
  // Consume the server-bound binding first; forged/stale/expired states
  // must not bind Square tokens to an org.
  const session = await getAuth();
  if (!session?.orgId || !session?.userId) {
    return NextResponse.redirect(new URL('/dashboard/integrations?err=square&reason=invalid_state', req.url));
  }
  const consumed = await consumeOAuthState(state, { orgId: session.orgId, userId: session.userId }, 'square');
  if (!consumed.ok) {
    return NextResponse.redirect(new URL(`/dashboard/integrations?err=square&reason=${encodeURIComponent(consumed.reason)}`, req.url));
  }

  const verifier = await squareGetPkceVerifier(state);
  if (!verifier) {
    return NextResponse.json(
      { error: 'PKCE verifier missing or expired — restart the connect flow' },
      { status: 400 }
    );
  }
  try {
    const tokens = await squareExchangeCode(code, verifier);
    await saveSquareConnection(consumed.orgId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      merchant_id: tokens.merchant_id ?? consumed.orgId,
    });
    return NextResponse.redirect(new URL(`/dashboard/integrations?ok=square`, req.url));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
