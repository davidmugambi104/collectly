import { NextRequest, NextResponse } from 'next/server';
import { xeroAuthUrl } from '@/lib/integrations/xero';
import { getAuth } from '@/lib/auth-helper';
import { mintOAuthState } from '@/lib/oauth-state';

/** SECURITY (audit C-1): see quickbooks/connect — org comes from the session,
 * state is server-bound and expiring. */
export async function GET(_req: NextRequest) {
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
    const state = await mintOAuthState(orgId, userId);
    const authUrl = xeroAuthUrl(state);
    // TEMP DEBUG (remove after Xero identity-error investigation): client_id
    // is a public OAuth identifier, not a secret — safe to log. Helps confirm
    // exactly what's being sent to Xero without exposing XERO_CLIENT_SECRET.
    const cid = process.env.XERO_CLIENT_ID ?? '';
    const ruri = process.env.XERO_REDIRECT_URI ?? '';
    console.log(
      '[xero/connect] client_id=%s (len=%d) redirect_uri=%s (len=%d)',
      JSON.stringify(cid), cid.length, JSON.stringify(ruri), ruri.length,
    );
    return NextResponse.redirect(authUrl);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}