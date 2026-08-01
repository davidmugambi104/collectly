import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  // Marketing pages
  '/', '/pricing', '/features', '/blog', '/blog/(.*)', '/customers', '/about', '/contact', '/changelog', '/privacy', '/terms', '/security',
  '/dpa', '/integrations', '/tools/(.*)', '/compare', '/ar-roi', '/ar-audit', '/tour',
  '/vs-chaser', '/vs-bill', '/vs-melio', '/vs-quickbooks',
  '/vs-gaviti', '/vs-growfin', '/vs-highradius', '/vs-freshbooks', '/vs-zohobooks',
  // Public auth flow
  '/sign-in(.*)', '/sign-up(.*)', '/sso-callback(.*)',
  // Payment portal — the customer's customer needs to hit this without an account.
  // Without these entries, Clerk's auth check returns 404 on /pay/... and the
  // dunning-email pay link silently breaks (the conversion funnel dead-ends).
  // /api/webhooks/* must remain public (webhooks can't carry Clerk tokens).
  '/pay/(.*)', '/api/payment/(.*)', '/api/paystack/(.*)',
  // Public marketing APIs
  '/api/waitlist', '/api/lead-notify', '/api/interview', '/api/ar-audit',
  // Public demo / preview / seed flows (no auth needed)
  '/api/cron/dunning', '/api/webhooks/stripe', '/api/webhooks/clerk',
  '/api/webhooks/resend-inbound',
  '/api/quickbooks/callback', '/api/quickbooks/connect',
  '/api/xero/callback', '/api/xero/connect',
  '/api/stripe-connect/callback', '/api/stripe-connect/connect',
  '/api/square/callback', '/api/square/connect',
  '/api/plaid/connect', '/api/plaid/exchange',
  '/api/dunning/preview', '/api/dunning/public-demo',
  '/api/exec-summary', '/api/forecast',
  // Sample data + dev seed (dev shim returns synthetic session anyway)
  '/api/seed', '/api/seed-sample',
  '/api/reset-data',
  '/api/support',
  // Lead capture + admin read-only
  '/api/admin/interviews/(.*)', '/api/playbook/download',
  // Unsubscribe (CAN-SPAM/PECR compliance) and one-shot migration endpoints
  '/api/unsubscribe', '/api/migrate/(.*)',
  // Outreach inbound reply webhook
  '/api/inbound',
  // Healthcheck must be public so external monitors can ping it.
  '/api/healthcheck',
]);

// In dev mode without Clerk keys, fall through (no-op).
// Also skip Clerk middleware when the dev shim is on, otherwise Clerk
// tries to validate tokens that don't exist and gets into a loop.
// SECURITY: refuse to enable the dev shim in production. We check this
// lazily (on first request) rather than at module load, because Next.js
// loads middleware at build time even for production builds — and the
// build must not require prod env to be production-clean. The first
// runtime request in production with USE_DEV_AUTH=1 will throw a 500,
// which is loud and obvious.
function isDevAuthShimAllowed(): boolean {
  if (process.env.USE_DEV_AUTH === '1' && process.env.NODE_ENV === 'production') {
    // Log once per process; do not throw at module load (breaks build).
    console.error(
      'FATAL: USE_DEV_AUTH=1 is set in production. Disable it (set USE_DEV_AUTH=0 or remove) before the next deploy.'
    );
    return false;
  }
  return true;
}

const hasClerk = isDevAuthShimAllowed()
  && !!(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  && process.env.USE_DEV_AUTH !== '1';

export default hasClerk
  ? clerkMiddleware(async (auth, req: NextRequest) => {
      if (!isPublicRoute(req)) {
        // Manual auth check instead of auth.protect() to avoid Clerk's
        // default 404 rewrite when the sign-in redirect can't be resolved.
        const { userId } = await auth();
        if (!userId) {
          if (req.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
          return NextResponse.redirect(new URL('/sign-in', req.url));
        }
        // MFA enforcement removed for free-tier dev builds. The helper
        // `src/lib/mfa.ts` is still available for when the workspace
        // upgrades to Pro and Clerk Multi-factor is flipped on.
      }
    })
  : (req: any) => {
      // No-op middleware in dev without Clerk
      return undefined;
    };

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
