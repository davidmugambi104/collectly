/**
 * Which host serves which request.
 *
 * The rename moves what people SEE and SEARCH, not the plumbing. So the two
 * domains split by role rather than one replacing the other:
 *
 *   mugavi.com        the public, indexed surface -- marketing, blog, pricing,
 *                     tools. This is the canonical domain for search.
 *   getcollectly.app  the application -- sign-in, sign-up, dashboard, admin --
 *                     plus every /api route.
 *
 * The application stays put because Clerk's production instance is bound to
 * getcollectly.app. Its frontend API is clerk.getcollectly.app, and it rejects
 * a request from the new origin outright:
 *
 *   {"code":"origin_invalid","message":"Invalid HTTP Origin header"}
 *
 * So a blanket redirect to mugavi.com would send every visitor to a domain
 * where they cannot log in. Moving Clerk is a separate, deliberate operation
 * (five CNAMEs and a new publishable key); until then, auth lives where it
 * works.
 *
 * /api stays on whichever host it was called on, never redirected. Webhooks
 * from Resend, Clerk, Stripe and Twilio are registered against
 * getcollectly.app and arrive as POSTs, which a 301 is not reliably re-issued
 * as; and the unsubscribe links in ~415 already-sent emails point there too.
 */
export const LEGACY_HOSTS = new Set(['getcollectly.app', 'www.getcollectly.app']);
export const PUBLIC_HOST = 'mugavi.com';
export const APP_HOST = 'getcollectly.app';

/** Routes that need a Clerk session, so must be served from APP_HOST. */
const APP_PREFIXES = ['/sign-in', '/sign-up', '/dashboard', '/admin'];

export function isAppPath(pathname: string): boolean {
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export interface HostRedirect {
  host: string;
  /** 301 for the permanent public move; 302 for the app, which moves when Clerk does. */
  status: 301 | 302;
}

/**
 * Whether Clerk's production instance now answers for PUBLIC_HOST.
 *
 * Flip this on (CLERK_ON_PUBLIC_HOST=1) only after Clerk's dashboard shows
 * mugavi.com as the production domain, its CNAMEs resolve, and the new
 * publishable/secret keys are in the environment. Until then it must stay off:
 * clerk.getcollectly.app answers `origin_invalid` for any other origin, so
 * flipping early sends every visitor to a domain where they cannot sign in.
 *
 * Read at call time rather than module load so it is testable and so a Vercel
 * env change takes effect on redeploy without a code change.
 */
export function clerkOnPublicHost(): boolean {
  return (
    process.env.NEXT_PUBLIC_CLERK_ON_PUBLIC_HOST === '1' ||
    process.env.CLERK_ON_PUBLIC_HOST === '1'
  );
}

/**
 * Returns where to send the request, or null to serve it as-is.
 *
 * `opts.clerkOnPublicHost` exists for tests; production reads the env.
 */
export function hostRedirect(
  host: string | null,
  pathname: string,
  opts?: { clerkOnPublicHost?: boolean },
): HostRedirect | null {
  const h = (host ?? '').toLowerCase().split(':')[0];
  const migrated = opts?.clerkOnPublicHost ?? clerkOnPublicHost();

  // Never redirect the API, on any host. See the note above.
  if (pathname === '/api' || pathname.startsWith('/api/')) return null;

  if (LEGACY_HOSTS.has(h)) {
    // Public pages on the retired domain move to the public one, permanently.
    if (!isAppPath(pathname)) return { host: PUBLIC_HOST, status: 301 };
    // App routes follow once Clerk does. 302 rather than 301 even after the
    // move: a cached permanent redirect here would survive a rollback, and
    // rolling back is the whole point of keeping this a flag.
    return migrated ? { host: PUBLIC_HOST, status: 302 } : null;
  }

  if (h === PUBLIC_HOST || h === `www.${PUBLIC_HOST}`) {
    // App routes reached on the public domain go back to where Clerk works.
    // Once Clerk is bound here, they stay put.
    if (migrated) return null;
    return isAppPath(pathname) ? { host: APP_HOST, status: 302 } : null;
  }

  // Previews, localhost, anything else: serve as-is.
  return null;
}
