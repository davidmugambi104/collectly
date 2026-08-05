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

  // Was QUICKBOOKS_CLIENT_ID here — that var is never set anywhere in the
  // app (qboAuthUrl() and every token exchange in
  // src/lib/integrations/quickbooks.ts read QBO_CLIENT_ID, matching
  // .env.example and the page's own "needs setup" check). With
  // QBO_CLIENT_ID actually configured, the integrations page correctly
  // showed QuickBooks as ready, but clicking Connect always 503'd here —
  // the most-used provider's connect button was dead for everyone.
  if (!process.env.QBO_CLIENT_ID) {
    return NextResponse.json(
      { error: 'QuickBooks not configured', hint: 'Set QBO_CLIENT_ID and QBO_CLIENT_SECRET' },
      { status: 503 },
    );
  }

  try {
    const state = await mintOAuthState(orgId, userId, 'quickbooks');
    return NextResponse.redirect(qboAuthUrl(state));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}