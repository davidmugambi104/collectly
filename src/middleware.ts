import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  // Marketing pages
  '/', '/pricing', '/features', '/blog', '/customers', '/about', '/contact', '/changelog', '/privacy', '/terms', '/security',
  '/dpa', '/integrations', '/tools/(.*)',
  // Public auth flow
  '/sign-in(.*)', '/sign-up(.*)', '/sso-callback(.*)',
  // Public marketing APIs
  '/api/waitlist', '/api/lead-notify', '/api/interview',
  // Public demo / preview / seed flows (no auth needed)
  '/api/cron/dunning', '/api/webhooks/stripe',
  '/api/quickbooks/callback', '/api/quickbooks/connect',
  '/api/xero/callback', '/api/xero/connect',
  '/api/stripe-connect/callback', '/api/stripe-connect/connect',
  '/api/square/callback', '/api/square/connect',
  '/api/plaid/connect', '/api/plaid/exchange',
  '/api/dunning/preview', '/api/dunning/public-demo',
  '/api/exec-summary', '/api/forecast',
  // Sample data + dev seed (dev shim returns synthetic session anyway)
  '/api/seed', '/api/seed-sample',
  // Lead capture + admin read-only
  '/api/admin/interviews/(.*)', '/api/playbook/download',
]);

// In dev mode without Clerk keys, fall through (no-op).
// Also skip Clerk middleware when the dev shim is on, otherwise Clerk
// tries to validate tokens that don't exist and gets into a loop.
const hasClerk = !!(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && process.env.USE_DEV_AUTH !== '1';

export default hasClerk
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    })
  : (req: any) => {
      // No-op middleware in dev without Clerk
      return undefined;
    };

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
