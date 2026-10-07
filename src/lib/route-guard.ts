/**
 * Decide whether an unmatched path (not in middleware's public allowlist)
 * should still force a sign-in redirect even when nothing real exists at
 * that path.
 *
 * Every real page in this app lives either under an authenticated surface
 * (/dashboard, /admin) or is a public marketing page that belongs in
 * middleware's isPublicRoute allowlist. Before this helper existed,
 * middleware redirected EVERY non-public, non-matched path to /sign-in —
 * including paths with no route at all (typos, dead links, old sitemap
 * entries, bots probing random paths). A signed-out visitor hitting a
 * nonexistent URL saw a 307 to /sign-in instead of a 404, which told
 * crawlers the page required a login rather than that it didn't exist.
 *
 * Only /dashboard and /admin need that redirect even when the sub-path is
 * unknown, because leaking a 404 under those prefixes would tell an
 * anonymous visitor which authenticated sub-paths do and don't exist.
 * Everywhere else, an unmatched path should fall through and let Next's
 * own router return a real 404.
 */
const AUTH_REQUIRED_EVEN_IF_UNKNOWN_PREFIXES = ['/dashboard', '/admin'];

export function requiresAuthEvenIfUnknown(pathname: string): boolean {
  return AUTH_REQUIRED_EVEN_IF_UNKNOWN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
