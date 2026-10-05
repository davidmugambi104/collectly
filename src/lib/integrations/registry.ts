/**
 * Every accounting provider Mugavi knows about, in one list. Pure data and rules: no database, no secrets.
 *
 * Feeds three places: config-status.ts (which env keys are missing, needed: 'later'), the dashboard
 * Integrations page (one honest card per provider), and the sync route. To add a provider: add its entry
 * here with the exact env var names, write its ProviderAdapter in adapters/<id>.ts and register it in
 * adapters/index.ts. Until the adapter is registered AND the env keys are set, its card says
 * "Not available yet" and has no Connect button.
 */
import type { ProviderId } from './adapter.ts';

export type ProviderDef = {
  id: 'quickbooks' | 'xero' | ProviderId;
  label: string;
  /** 'oauth' connects to the vendor API. 'file' needs no keys (spreadsheet import). */
  kind: 'oauth' | 'file';
  /** True for Xero and QuickBooks, which have their own older code paths and cards. */
  native: boolean;
  /** Every one must be set for the provider to count as configured. Names are fixed: adapters read exactly these. */
  envVars: string[];
  /** One plain sentence for the card. */
  blurb: string;
  /** Where Mugavi gets the keys. */
  where: string;
};

const oauthVars = (prefix: string): string[] => [`${prefix}_CLIENT_ID`, `${prefix}_CLIENT_SECRET`, `${prefix}_REDIRECT_URI`];

export const PROVIDERS: ProviderDef[] = [
  { id: 'quickbooks', label: 'QuickBooks Online', kind: 'oauth', native: true, envVars: ['QBO_CLIENT_ID', 'QBO_CLIENT_SECRET', 'QBO_REDIRECT_URI'], blurb: 'Sync invoices, customers, and credit memos from QuickBooks.', where: 'developer.intuit.com' },
  { id: 'xero', label: 'Xero', kind: 'oauth', native: true, envVars: ['XERO_CLIENT_ID', 'XERO_CLIENT_SECRET', 'XERO_REDIRECT_URI'], blurb: 'Sync invoices, customers, and credit notes from Xero.', where: 'developer.xero.com' },
  { id: 'freshbooks', label: 'FreshBooks', kind: 'oauth', native: false, envVars: oauthVars('FRESHBOOKS'), blurb: 'Sync open invoices and clients from FreshBooks.', where: 'my.freshbooks.com developer page' },
  { id: 'zoho_books', label: 'Zoho Books', kind: 'oauth', native: false, envVars: oauthVars('ZOHO_BOOKS'), blurb: 'Sync open invoices and customers from Zoho Books.', where: 'api-console.zoho.com' },
  { id: 'sage', label: 'Sage', kind: 'oauth', native: false, envVars: oauthVars('SAGE'), blurb: 'Sync open sales invoices and customers from Sage Accounting.', where: 'developer.sage.com' },
  { id: 'wave', label: 'Wave', kind: 'oauth', native: false, envVars: oauthVars('WAVE'), blurb: 'Sync open invoices and customers from Wave.', where: 'developer.waveapps.com' },
  { id: 'csv', label: 'Spreadsheet (CSV)', kind: 'file', native: false, envVars: [], blurb: 'Works with any accounting tool. Upload an export; re-upload to refresh.', where: 'Nothing needed' },
];

export const UNAVAILABLE_LABEL = 'Not available yet - needs setup by Mugavi';
export const BETA_LABEL = 'Beta - not tested against the live service';

export function providerDef(id: string): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function missingEnv(def: Pick<ProviderDef, 'envVars'>, env: Record<string, string | undefined>): string[] {
  return def.envVars.filter((v) => !env[v] || env[v]!.trim() === '');
}

export type CardState =
  | { state: 'file'; badge: null; note: string }
  | { state: 'beta'; badge: string; note: string }
  | { state: 'unavailable'; badge: string; note: string };

/**
 * The honest state of a provider card. A Connect button is allowed only for 'beta' (adapter registered and keys set)
 * and for native providers that are configured. Never a button that leads nowhere.
 */
export function providerCardState(def: ProviderDef, hasAdapter: boolean, env: Record<string, string | undefined>): CardState {
  if (def.kind === 'file') return { state: 'file', badge: null, note: 'Re-upload to refresh; it does not sync automatically.' };
  const configured = missingEnv(def, env).length === 0;
  if (configured && (hasAdapter || def.native)) {
    return { state: 'beta', badge: def.native ? 'Ready to connect' : BETA_LABEL, note: def.native ? '' : 'Connects to the real service, but Mugavi has not tested it against a live account yet.' };
  }
  return { state: 'unavailable', badge: UNAVAILABLE_LABEL, note: 'You can still bring invoices in from a spreadsheet export.' };
}

/** Service rows for config-status.ts: the providers that need keys and have no row of their own. Always 'later'. */
export function registryServices(): Array<{ id: string; name: string; why: string; needed: 'later'; vars: string[]; where: string; without: string }> {
  return PROVIDERS.filter((p) => !p.native && p.kind === 'oauth').map((p) => ({
    id: p.id,
    name: p.label,
    why: `Sync from ${p.label}. Optional: the spreadsheet import covers it without keys.`,
    needed: 'later' as const,
    vars: p.envVars,
    where: p.where,
    without: `${p.label} cannot be connected; its card says it is not available yet.`,
  }));
}
