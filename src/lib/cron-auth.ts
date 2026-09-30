import { timingSafeEqual } from 'node:crypto';

/**
 * Bearer-token check for scheduled jobs. More than one secret can be accepted:
 * Vercel's own daily cron sends CRON_SECRET, and the hourly GitHub job sends its
 * own DUNNING_TRIGGER_SECRET, so the shared CRON_SECRET never has to leave Vercel.
 * Compared in constant time.
 */
export function configuredSecrets(...values: Array<string | undefined>): string[] {
  return values.filter((v): v is string => typeof v === 'string' && v.length >= 16);
}

export function cronAuthorized(authorization: string | null, secrets: string[]): boolean {
  if (!authorization || secrets.length === 0) return false;
  const given = Buffer.from(authorization);
  let ok = false;
  for (const s of secrets) {
    const want = Buffer.from(`Bearer ${s}`);
    if (want.length === given.length && timingSafeEqual(want, given)) ok = true;
  }
  return ok;
}
