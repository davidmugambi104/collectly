/**
 * The admin allowlist, in one place. Both the admin gate (auth-helper) and the crash-alert
 * recipient (api/errors) read ADMIN_EMAILS, and each used to carry its own copy of the parsing.
 */
const LEGACY_DEFAULT = 'davie@getcollectly.app';

export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? LEGACY_DEFAULT)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined, list: string[]): boolean {
  const e = email?.trim().toLowerCase();
  return !!e && list.includes(e);
}
