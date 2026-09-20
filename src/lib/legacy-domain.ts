/**
 * Which requests move from the retired domain to the canonical one.
 *
 * Kept as a pure function, separate from middleware, so the carve-out below is
 * testable without standing up next/server.
 */
export const LEGACY_HOSTS = new Set(['getcollectly.app', 'www.getcollectly.app']);
export const CANONICAL_HOST = 'mugavi.com';

/**
 * Returns the host to redirect to, or null to serve the request as-is.
 *
 * /api/* stays on the legacy host on purpose:
 *
 *  - Webhooks registered with Resend, Clerk, Stripe and Twilio point at the old
 *    domain and arrive as POSTs. A 301 is not reliably re-issued as a POST by
 *    every client, so redirecting them risks dropping deliveries silently.
 *  - The unsubscribe links in ~415 already-sent outreach emails are
 *    getcollectly.app/api/unsubscribe?token=... An opt-out that depends on a
 *    redirect chain is an opt-out with an extra way to fail.
 */
export function legacyRedirectHost(host: string | null, pathname: string): string | null {
  const h = (host ?? '').toLowerCase().split(':')[0];
  if (!LEGACY_HOSTS.has(h)) return null;
  if (pathname.startsWith('/api/')) return null;
  return CANONICAL_HOST;
}
