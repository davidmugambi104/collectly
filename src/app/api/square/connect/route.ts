import { NextResponse } from 'next/server';
import { squareAuthUrl } from '@/lib/integrations/square';
import { getAuth } from '@/lib/auth-helper';
import { mintOAuthState } from '@/lib/oauth-state';

/**
 * SECURITY (audit C-1 follow-up): this route used to accept `?orgId=` from
 * any unauthenticated caller and pass it straight through as the OAuth
 * `state`, exactly the same flaw already fixed for QuickBooks/Xero. Since
 * this route is on the Clerk-public allowlist (OAuth providers can't carry
 * Clerk cookies), a third party could hit it directly with a victim's orgId,
 * complete Square's OAuth as themselves, and have the callback bind their
 * own Square account to the victim's org — silently rerouting that org's
 * customer payment links to the attacker's Square merchant account. We now
 * derive the org from the caller's own session and mint a server-side
 * binding for the state, so the state can never be forged.
 */
export async function GET() {
  const session = await getAuth();
  const orgId = session?.orgId;
  const userId = session?.userId;
  if (!orgId || !userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!process.env.SQUARE_CLIENT_ID) {
    return NextResponse.json(
      { error: 'Square not configured', hint: 'Set SQUARE_CLIENT_ID and SQUARE_CLIENT_SECRET in .env.local' },
      { status: 503 }
    );
  }

  try {
    const state = await mintOAuthState(orgId, userId, 'square');
    return NextResponse.redirect(squareAuthUrl(state));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
