import { NextRequest, NextResponse } from 'next/server';
import { qboExchangeCode, saveQboConnection } from '@/lib/integrations/quickbooks';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const realmId = url.searchParams.get('realmId');
  const state = url.searchParams.get('state'); // orgId
  if (!code || !realmId || !state) return NextResponse.json({ error: 'missing params' }, { status: 400 });
  try {
    const tokens = await qboExchangeCode(code, realmId);
    await saveQboConnection(state, { ...tokens, realmId });
    return NextResponse.redirect(new URL(`/dashboard/integrations?ok=quickbooks`, req.url));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
