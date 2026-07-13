import { NextRequest, NextResponse } from 'next/server';
import { qboAuthUrl } from '@/lib/integrations/quickbooks';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get('orgId');
  if (!orgId) return NextResponse.json({ error: 'missing orgId' }, { status: 400 });
  return NextResponse.redirect(qboAuthUrl(orgId));
}
