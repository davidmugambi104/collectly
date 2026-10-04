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
