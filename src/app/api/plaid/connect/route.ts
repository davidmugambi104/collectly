import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { plaidCreateLinkToken } from '@/lib/integrations/plaid';

export async function POST(req: NextRequest) {
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return NextResponse.json(
      { error: 'Plaid not configured', hint: 'Set PLAID_CLIENT_ID and PLAID_SECRET in .env.local' },
      { status: 503 }
    );
  }
  try {
    const data = await plaidCreateLinkToken(orgId);
    return NextResponse.json({ link_token: data.link_token, expiration: data.expiration });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
