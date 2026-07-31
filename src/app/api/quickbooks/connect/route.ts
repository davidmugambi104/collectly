import { NextRequest, NextResponse } from 'next/server';
import { qboAuthUrl } from '@/lib/integrations/quickbooks';
import { getAuth } from '@/lib/auth-helper';
import { mintOAuthState } from '@/lib/oauth-state';

/**
 * SECURITY (audit C-1): this route used to accept `?orgId=` from any
 * unauthenticated caller and pass it through as the OAuth `state`. We now
 * derive the org from the caller's session and mint a server-side binding
 * (Redis/cookie) for the state, so a third party cannot bind their
 * QuickBooks account to someone else's org.
 */
export async function GET(_req: NextRequest) {
  const session = await getAuth();
  const orgId = session?.orgId;
  const userId = session?.userId;
  if (!orgId || !userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!process.env.QUICKBOOKS_CLIENT_ID) {
    return NextResponse.json(
      { error: 'QuickBooks not configured', hint: 'Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET' },
      { status: 503 },
    );
  }

  try {
    const state = await mintOAuthState(orgId, userId);
    return NextResponse.redirect(qboAuthUrl(state));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}