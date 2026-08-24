import { NextResponse } from 'next/server';
import { xeroAuthUrl } from '@/lib/integrations/xero';
import { getAuth } from '@/lib/auth-helper';
import { mintOAuthState } from '@/lib/oauth-state';

/** SECURITY (audit C-1): see quickbooks/connect — org comes from the session,
 * state is server-bound and expiring. */
export async function GET() {
  const session = await getAuth();
  const orgId = session?.orgId;
  const userId = session?.userId;
  if (!orgId || !userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!process.env.XERO_CLIENT_ID) {
    return NextResponse.json(
      { error: 'Xero not configured', hint: 'Set XERO_CLIENT_ID and XERO_CLIENT_SECRET in .env.local' },
      { status: 503 },
    );
  }

  try {
    const state = await mintOAuthState(orgId, userId, 'xero');
    const authUrl = xeroAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}