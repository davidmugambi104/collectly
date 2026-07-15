import { NextRequest, NextResponse } from 'next/server';
import { squareExchangeCode, squareGetPkceVerifier, saveSquareConnection } from '@/lib/integrations/square';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // orgId
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/integrations?err=square&reason=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.json({ error: 'missing code or state' }, { status: 400 });
  }
  const verifier = squareGetPkceVerifier(state);
  if (!verifier) {
    return NextResponse.json(
      { error: 'PKCE verifier missing or expired — restart the connect flow' },
      { status: 400 }
    );
  }
  try {
    const tokens = await squareExchangeCode(code, verifier);
    await saveSquareConnection(state, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      merchant_id: tokens.merchant_id ?? state,
    });
    return NextResponse.redirect(new URL(`/dashboard/integrations?ok=square`, req.url));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
