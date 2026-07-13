import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/', '/pricing', '/features', '/blog', '/customers', '/about', '/contact', '/changelog', '/privacy', '/terms', '/security',
  '/api/waitlist', '/api/cron/dunning', '/api/webhooks/stripe',
  '/api/quickbooks/callback', '/api/quickbooks/connect',
  '/sign-in(.*)', '/sign-up(.*)',
]);

// In dev mode without Clerk keys, fall through (no-op)
const hasClerk = !!(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

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
