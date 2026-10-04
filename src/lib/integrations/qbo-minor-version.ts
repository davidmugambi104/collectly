/** Intuit retired minor versions below 75; an explicit value keeps responses stable. */
export const QBO_MINOR_VERSION = 75;

export function withMinorVersion(path: string): string {
  if (/[?&]minorversion=/.test(path)) return path;
  return `${path}${path.includes('?') ? '&' : '?'}minorversion=${QBO_MINOR_VERSION}`;
}
