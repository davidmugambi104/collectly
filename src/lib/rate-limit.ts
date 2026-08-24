import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '@/lib/infra';

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

const DEFAULTS = {
  windowMs: 60_000, // 1 minute
  max: 10,
};

// In-process fallback when Upstash is not configured (local dev / tests).
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

function inProcessRateLimit(ip: string, opts: { windowMs?: number; max?: number } = {}): RateLimitResult {
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

/**
 * IP-based rate limiter backed by Upstash Redis in production.
 * Falls back to an in-process map when Redis is not configured.
 */
export async function rateLimit(
  ip: string,
  opts: { windowMs?: number; max?: number } = {},
): Promise<RateLimitResult> {
  const windowMs = opts.windowMs ?? DEFAULTS.windowMs;
  const max = opts.max ?? DEFAULTS.max;
  const redis = getRedis();
  if (!redis) {
    return inProcessRateLimit(ip, opts);
  }

  // Upstash ratelimit windows are defined as seconds; convert from ms.
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${windowSeconds}s`),
    analytics: true,
    prefix: 'collectly:ratelimit',
  });

  const identifier = ip || 'unknown';
  const { success, remaining, reset } = await limiter.limit(identifier);
  return {
    allowed: success,
    remaining: Math.max(0, remaining),
    resetAt: reset,
  };
}

/** Best-effort client IP from request headers. */
export function getIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
