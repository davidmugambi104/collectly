/**
 * Mark a response as uncacheable. Used on the OAuth connect, callback and
 * disconnect endpoints: their responses carry per-session redirects, error
 * detail and connection state, and must never sit in a shared or browser cache.
 */
export const NO_STORE = 'no-store, no-cache, must-revalidate';

export function noStore<T extends Response>(res: T): T {
  res.headers.set('Cache-Control', NO_STORE);
  res.headers.set('Pragma', 'no-cache');
  return res;
}
