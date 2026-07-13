/**
 * Tiny IP-based rate limiter. In-process map; for production replace
 * with @upstash/ratelimit or similar. Good enough for spam protection
 * on waitlist / interview / playbook forms.
 */
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

const DEFAULTS = {
  windowMs: 60_000, // 1 minute
  max: 10,
};

export function rateLimit(
  ip: string,
  opts: { windowMs?: number; max?: number } = {},
): { allowed: boolean; remaining: number; resetAt: number } {
  const windowMs = opts.windowMs ?? DEFAULTS.windowMs;
  const max = opts.max ?? DEFAULTS.max;
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / windowMs)}`;
  const entry = buckets.get(key);
  if (!entry) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }
  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

/** Best-effort client IP from request headers. */
export function getIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
