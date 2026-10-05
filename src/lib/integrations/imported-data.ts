/**
 * Data a Xero sync left behind.
 *
 * Disconnecting stops new syncs but keeps what was imported, which surprised an owner whose
 * connection had landed on the wrong organisation. Xero ids are GUIDs and QuickBooks ids are
 * plain numbers, so "imported from Xero" can be told apart without a provider column and
 * without touching anything typed in by hand or synced from QuickBooks.
 */
export const XERO_ID_PATTERN = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
/** QuickBooks ids are short plain numbers. Capped at 18 digits so a long all-digit id from another provider is never matched. */
export const QBO_ID_PATTERN = '^[0-9]{1,18}$';
const RE = new RegExp(XERO_ID_PATTERN, 'i');
const QBO_RE = new RegExp(QBO_ID_PATTERN);

/**
 * Providers added after Xero and QuickBooks. Their rows are stored with a provider prefix on the external id
 * ("freshbooks:123", "csv:inv:ab12..."), because their native ids (plain numbers, UUIDs) would collide with the
 * QuickBooks and Xero patterns above and with each other. runSync and the CSV importer add the prefix with
 * externalIdFor(); a provider adapter never writes a bare id. The purge matches on the prefix only.
 */
export const PREFIXED_PROVIDERS = ['freshbooks', 'zoho_books', 'sage', 'wave', 'csv'] as const;
export type PrefixedProvider = (typeof PREFIXED_PROVIDERS)[number];

export type ImportProvider = 'xero' | 'quickbooks' | PrefixedProvider;
export const IMPORT_PROVIDERS: readonly ImportProvider[] = ['xero', 'quickbooks', ...PREFIXED_PROVIDERS];
export const PROVIDER_LABEL: Record<ImportProvider, string> = {
  xero: 'Xero', quickbooks: 'QuickBooks', freshbooks: 'FreshBooks', zoho_books: 'Zoho Books', sage: 'Sage', wave: 'Wave', csv: 'a spreadsheet',
};
/** "^freshbooks:" etc. Provider ids are fixed lowercase words and underscores, so there is nothing to escape. */
export const prefixedIdPattern = (provider: PrefixedProvider): string => `^${provider}:`;
export const PROVIDER_ID_PATTERN: Record<ImportProvider, string> = {
  xero: XERO_ID_PATTERN,
  quickbooks: QBO_ID_PATTERN,
  freshbooks: prefixedIdPattern('freshbooks'),
  zoho_books: prefixedIdPattern('zoho_books'),
  sage: prefixedIdPattern('sage'),
  wave: prefixedIdPattern('wave'),
  csv: prefixedIdPattern('csv'),
};

export function isPrefixedProvider(v: unknown): v is PrefixedProvider {
  return typeof v === 'string' && (PREFIXED_PROVIDERS as readonly string[]).includes(v);
}

/** The id to store for something a prefixed provider returned. Idempotent. */
export function externalIdFor(provider: PrefixedProvider, rawId: string): string {
  const prefix = `${provider}:`;
  return rawId.startsWith(prefix) ? rawId : prefix + rawId;
}

/** True when this external id carries the provider's prefix. The same rule the SQL purge uses. */
export function matchesProviderId(provider: ImportProvider, externalId: string | null | undefined): boolean {
  return typeof externalId === 'string' && new RegExp(PROVIDER_ID_PATTERN[provider], 'i').test(externalId);
}

export function parseImportProvider(v: unknown): ImportProvider | null {
  return typeof v === 'string' && (IMPORT_PROVIDERS as readonly string[]).includes(v) ? (v as ImportProvider) : null;
}

/** True for an id in QuickBooks' format (digits only, never a GUID). */
export function isQboId(externalId: string | null | undefined): boolean {
  return typeof externalId === 'string' && QBO_RE.test(externalId);
}

/** True for an id in Xero's format. */
export function isXeroId(externalId: string | null | undefined): boolean {
  return typeof externalId === 'string' && RE.test(externalId);
}

export type ImportedSummary = { customers: number; invoices: number; sampleCustomers: string[] };

/** What the notice says. */
export function describeImported(s: ImportedSummary, provider: ImportProvider = 'xero'): string | null {
  if (s.customers === 0 && s.invoices === 0) return null;
  const inv = `${s.invoices} invoice${s.invoices === 1 ? '' : 's'}`;
  const cus = `${s.customers} customer${s.customers === 1 ? '' : 's'}`;
  return `${inv} and ${cus} imported from ${PROVIDER_LABEL[provider]} are still here.`;
}
