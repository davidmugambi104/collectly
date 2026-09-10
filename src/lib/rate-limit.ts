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

function inProcessRateLimit(key: string, opts: { windowMs?: number; max?: number } = {}): RateLimitResult {
  const windowMs = opts.windowMs ?? DEFAULTS.windowMs;
  const max = opts.max ?? DEFAULTS.max;
  const now = Date.now();
  const bucketKey = `${key}:${Math.floor(now / windowMs)}`;
  const entry = buckets.get(bucketKey);
  if (!entry) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    // Opportunistic cleanup: this map otherwise grows unboundedly for the
    // lifetime of the process, one entry per distinct key:window forever.
    // Cheap since it only runs on a cache miss, not every call.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
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
 *
 * `opts.key` namespaces the bucket — without it, every call site shared
 * one flat `ip`-only keyspace (both here and in the Redis path below,
 * which used a single fixed `prefix` with no per-endpoint distinction
 * either), so a user hitting one public endpoint a few times could get
 * blocked from an unrelated one on the same IP because the shared
 * counter was already past that second endpoint's own (lower) max.
 * Defaults to 'default' for any caller that hasn't been updated to pass
 * one, which preserves the old shared-keyspace behavior for those call
 * sites rather than silently changing their limits.
 */
export async function rateLimit(
  ip: string,
  opts: { windowMs?: number; max?: number; key?: string } = {},
): Promise<RateLimitResult> {
  const windowMs = opts.windowMs ?? DEFAULTS.windowMs;
  const max = opts.max ?? DEFAULTS.max;
  const namespace = opts.key ?? 'default';
  const identifier = `${namespace}:${ip || 'unknown'}`;
  const redis = getRedis();
  if (!redis) {
    return inProcessRateLimit(identifier, opts);
  }

  // Upstash ratelimit windows are defined as seconds; convert from ms.
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${windowSeconds}s`),
    analytics: true,
    prefix: `collectly:ratelimit:${namespace}`,
  });

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
