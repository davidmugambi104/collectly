import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { plaidExchangePublicToken, savePlaidConnection } from '@/lib/integrations/plaid';

export async function POST(req: NextRequest) {
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { public_token?: string };
  if (!body.public_token) {
    return NextResponse.json({ error: 'missing public_token' }, { status: 400 });
  }
  try {
    const tokens = await plaidExchangePublicToken(body.public_token);
    await savePlaidConnection(orgId, tokens);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
