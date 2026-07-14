/**
 * Helpers for safely reading query params from a Next.js URL.
 * Truncates long values to prevent abuse.
 */

const MAX_LEN = 200;

export function paramString(sp: URLSearchParams | Record<string, string | string[] | undefined>, key: string, fallback = ''): string {
  let v: string | string[] | undefined;
  if (sp instanceof URLSearchParams) {
    v = sp.get(key) ?? undefined;
  } else {
    v = sp[key];
    if (Array.isArray(v)) v = v[0];
  }
  if (typeof v !== 'string') return fallback;
  return v.slice(0, MAX_LEN);
}

export function paramEnum<T extends string>(sp: URLSearchParams | Record<string, string | string[] | undefined>, key: string, allowed: readonly T[], fallback: T): T {
  const v = paramString(sp, key, fallback);
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}
