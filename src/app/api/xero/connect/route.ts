import { NextRequest, NextResponse } from 'next/server';
import { xeroAuthUrl } from '@/lib/integrations/xero';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get('orgId');
  if (!orgId) {
    return NextResponse.json({ error: 'missing orgId' }, { status: 400 });
  }
  if (!process.env.XERO_CLIENT_ID) {
    return NextResponse.json(
      { error: 'Xero not configured', hint: 'Set XERO_CLIENT_ID and XERO_CLIENT_SECRET in .env.local' },
      { status: 503 }
    );
  }
  return NextResponse.redirect(xeroAuthUrl(orgId));
}
