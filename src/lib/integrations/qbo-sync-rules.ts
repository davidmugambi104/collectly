/**
 * Pure rules for reading QuickBooks data: no database, no network, relative
 * imports only so node --test can load it.
 */

/**
 * A voided or deleted invoice is closed at the source. QuickBooks keeps a voided
 * invoice (Balance 0, TotalAmt 0, PrivateNote starting "Voided") and drops a
 * deleted one from queries altogether. Change-data payloads label it status
 * "Deleted". The amounts alone would read a voided invoice as paid.
 */
export function qboClosure(inv: { TotalAmt?: number; Balance?: number; PrivateNote?: string; status?: string } | null | undefined): 'voided' | 'deleted' | null {
  if (!inv) return null;
  if (String(inv.status ?? '').toLowerCase() === 'deleted') return 'deleted';
  const note = String(inv.PrivateNote ?? '').trim();
  if (/^void(ed)?\b/i.test(note) && Number(inv.Balance ?? 0) === 0) return 'voided';
  return null;
}

/**
 * Did this fetch fail because the object no longer exists? QuickBooks answers a
 * deleted id with a Fault code 610 ("Object Not Found"), usually on a 400, sometimes a 404.
 * Anything else (throttling, auth, 5xx) is not proof of deletion.
 */
export function isQboNotFound(error: unknown): boolean {
  const m = error instanceof Error ? error.message : String(error ?? '');
  return /failed: 404\b/.test(m) || /"code"\s*:\s*"?610"?/.test(m) || /object not found/i.test(m) || /\bnot found\b/i.test(m);
}

/**
 * Fault code 3100 ("ApplicationAuthorizationFailed") is what Intuit returns when a
 * token minted against one API base (sandbox or production) is presented to the
 * other -- observed directly on 2026-10-06: a sandbox token against the production
 * base gave exactly this on a 403. It is not a broken connection a reconnect fixes;
 * QBO_ENVIRONMENT (or the app's keys) does not match where the token came from.
 * Distinguishing this from a generic Fault lets the admin get a message that names
 * the actual cause instead of a raw JSON blob.
 */
export function qboFaultIsEnvironmentMismatch(fault: unknown): boolean {
  // Accept a raw response body (already a JSON string) as-is; stringifying it
  // again would escape its quotes and the code/name patterns would never match.
  const s = typeof fault === 'string' ? fault : JSON.stringify(fault ?? '');
  return /"code"\s*:\s*"?3100"?/.test(s) || /ApplicationAuthorizationFailed/i.test(s);
}

/** Admin-facing explanation for a 3100 fault. Never shown to the customer -- it names an internal config knob. */
export const QBO_ENVIRONMENT_MISMATCH_ADMIN_MESSAGE =
  'QuickBooks rejected this request with ApplicationAuthorizationFailed (3100): the access token was issued for one ' +
  'environment (sandbox or production) but QBO_ENVIRONMENT, or the client ID/secret in use, points at the other. ' +
  'Check that QBO_ENVIRONMENT matches the keys the connection was made with, then reconnect.';

/** What the customer sees for the same failure: no fault codes, no environment names, just that it needs attention. */
export const QBO_ENVIRONMENT_MISMATCH_CUSTOMER_MESSAGE =
  'QuickBooks did not accept this connection. Reconnect QuickBooks from Integrations; if it keeps failing, contact support.';

const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', UK: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD', IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR',
};

function iso(v: unknown): string | null {
  const s = String(v ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : null;
}

/**
 * The company's home currency. QuickBooks omits CurrencyRef on every
 * transaction of a single-currency company, so that absence means "home", not USD.
 * Order: Preferences.CurrencyPrefs.HomeCurrency, then the CompanyInfo country,
 * then the organisation's own base currency, then USD.
 */
export function resolveHomeCurrency(o: {
  preferences?: { Preferences?: { CurrencyPrefs?: { HomeCurrency?: { value?: string } }; CurrencyPref?: { HomeCurrency?: { value?: string } } } } | null;
  companyInfo?: { CompanyInfo?: { Country?: string; LegalAddr?: { Country?: string } } } | null;
  orgBaseCurrency?: string | null;
}): { currency: string; source: 'preferences' | 'country' | 'organization' | 'default' } {
  const prefs = o.preferences?.Preferences;
  const fromPrefs = iso(prefs?.CurrencyPrefs?.HomeCurrency?.value) ?? iso(prefs?.CurrencyPref?.HomeCurrency?.value);
  if (fromPrefs) return { currency: fromPrefs, source: 'preferences' };
  const ci = o.companyInfo?.CompanyInfo;
  const country = String(ci?.Country ?? ci?.LegalAddr?.Country ?? '').trim().toUpperCase();
  if (COUNTRY_CURRENCY[country]) return { currency: COUNTRY_CURRENCY[country], source: 'country' };
  const fromOrg = iso(o.orgBaseCurrency);
  if (fromOrg) return { currency: fromOrg, source: 'organization' };
  return { currency: 'USD', source: 'default' };
}
