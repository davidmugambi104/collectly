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

export type ImportProvider = 'xero' | 'quickbooks';
export const IMPORT_PROVIDERS: readonly ImportProvider[] = ['xero', 'quickbooks'];
export const PROVIDER_LABEL: Record<ImportProvider, string> = { xero: 'Xero', quickbooks: 'QuickBooks' };
export const PROVIDER_ID_PATTERN: Record<ImportProvider, string> = { xero: XERO_ID_PATTERN, quickbooks: QBO_ID_PATTERN };

export function parseImportProvider(v: unknown): ImportProvider | null {
  return v === 'xero' || v === 'quickbooks' ? v : null;
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
