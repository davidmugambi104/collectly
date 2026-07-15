import { NextRequest, NextResponse } from 'next/server';
import { squareAuthUrl } from '@/lib/integrations/square';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get('orgId');
  if (!orgId) {
    return NextResponse.json({ error: 'missing orgId' }, { status: 400 });
  }
  if (!process.env.SQUARE_CLIENT_ID) {
    return NextResponse.json(
      { error: 'Square not configured', hint: 'Set SQUARE_CLIENT_ID and SQUARE_CLIENT_SECRET in .env.local' },
      { status: 503 }
    );
  }
  return NextResponse.redirect(squareAuthUrl(orgId));
}
