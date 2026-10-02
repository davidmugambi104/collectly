/**
 * Key material for the OAuth state cookie fallback (used only when Redis is not configured).
 * A hardcoded fallback is fine for a laptop and never fine in production: anyone who read the
 * source could forge the cookie. In production with no secret set, refuse rather than fall back.
 */
export function resolveStateSecret(env: Record<string, string | undefined>): string {
  const s = env.OAUTH_STATE_SECRET || env.CRON_SECRET;
  if (s) return s;
  if (env.NODE_ENV === 'production') {
    throw new Error('OAUTH_STATE_SECRET (or CRON_SECRET) must be set to use the OAuth state cookie without Redis.');
  }
  return 'collectly-dev-fallback';
}
