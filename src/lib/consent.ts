/**
 * Cookie-consent model.
 *
 * Two non-essential categories, because that is what this site actually
 * loads. Keeping the list honest matters: a banner that names categories the
 * site does not use is its own kind of misleading, and one that omits a
 * category it does use is the thing regulators fine people for.
 *
 *   analytics    PostHog (product analytics), Microsoft Clarity (session
 *                recording + heatmaps)
 *   advertising  Google AdSense
 *
 * Strictly necessary cookies — Clerk's session, the consent record itself —
 * are not listed because they do not require consent under PECR reg. 6(4) or
 * GDPR Art. 6(1)(f). They are also not optional, so offering a toggle for
 * them would be theatre.
 */

export type ConsentCategory = 'analytics' | 'advertising';

export type ConsentState = {
  analytics: boolean;
  advertising: boolean;
  /** ISO timestamp. Consent has to be demonstrable, which means dated. */
  decidedAt: string;
  /** Bump when the categories or the vendors behind them change; an old
   *  record then stops counting as a decision about the new set. */
  version: number;
};

/**
 * Cookie holding the visitor's two-letter country, set by middleware from the
 * edge geo header and read by the consent provider in the browser.
 *
 * Not httpOnly, on purpose: the whole point is that client JS reads it to
 * decide whether to show the banner. It carries a country code and nothing
 * else — no id, no fingerprint, nothing that identifies anyone — and it is
 * what makes the legally required banner appear for the people entitled to
 * it, which is why it belongs in the strictly-necessary group.
 */
export const COUNTRY_COOKIE = 'cc';

/** A day. Long enough that almost nobody pays the uncached first request
 *  twice; short enough that someone who flies to Berlin is asked there. */
export const COUNTRY_COOKIE_MAX_AGE = 60 * 60 * 24;

/**
 * The country for this request, from whichever edge set it.
 *
 * Vercel is first because that is where this deploys. Cloudflare and the
 * generic Fastly-style header are there so a proxy change does not silently
 * turn geo-detection off — and failing to read a country is not a quiet
 * degradation, it means every visitor on earth gets the banner.
 */
export function countryFromHeaders(get: (name: string) => string | null): string | null {
  for (const header of ['x-vercel-ip-country', 'cf-ipcountry', 'x-country-code']) {
    const value = get(header);
    // Some edges send "XX" for unknown rather than omitting the header.
    if (value && /^[A-Za-z]{2}$/.test(value) && value.toUpperCase() !== 'XX') {
      return value.toUpperCase();
    }
  }
  return null;
}

export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = 'collectly_consent';

export const ALL_GRANTED: Omit<ConsentState, 'decidedAt' | 'version'> = {
  analytics: true,
  advertising: true,
};

export const ALL_DENIED: Omit<ConsentState, 'decidedAt' | 'version'> = {
  analytics: false,
  advertising: false,
};

export function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    // A record written against an older category set is not a decision about
    // the current one, so it is treated as no decision rather than silently
    // carried forward.
    if (parsed.version !== CONSENT_VERSION) return null;
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.advertising !== 'boolean') return null;
    return {
      analytics: parsed.analytics,
      advertising: parsed.advertising,
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : new Date().toISOString(),
      version: CONSENT_VERSION,
    };
  } catch {
    // Private mode, disabled storage, or corrupt JSON. No record means no
    // consent, which is the safe reading.
    return null;
  }
}

export function writeConsent(choice: Omit<ConsentState, 'decidedAt' | 'version'>): ConsentState {
  const state: ConsentState = { ...choice, decidedAt: new Date().toISOString(), version: CONSENT_VERSION };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable. The choice still applies for this page view; it
    // just will not survive a reload, and the banner will ask again.
  }
  return state;
}

/**
 * EEA + UK + Switzerland.
 *
 * Where a banner is legally required. Everywhere else the scripts load as
 * they did before, which is why this list exists rather than showing the
 * banner to every visitor on earth.
 *
 * Switzerland is included for the revised FADP. Iceland, Liechtenstein and
 * Norway are EEA but not EU, and are the ones most often left out by mistake.
 */
const CONSENT_REQUIRED_COUNTRIES = new Set([
  // EU
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
  'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  // EEA non-EU
  'IS','LI','NO',
  // UK, Switzerland
  'GB','CH',
]);

/**
 * Whether this visitor must be asked before non-essential scripts load.
 *
 * Fails CLOSED: an unknown country (no geo header — local dev, a self-hosted
 * deploy, a stripped proxy) is treated as requiring consent. Getting this
 * wrong in the other direction means loading advertising cookies for someone
 * protected by PECR, which is the expensive mistake.
 */
export function consentRequiredForCountry(country: string | null | undefined): boolean {
  if (!country) return true;
  return CONSENT_REQUIRED_COUNTRIES.has(country.toUpperCase());
}
