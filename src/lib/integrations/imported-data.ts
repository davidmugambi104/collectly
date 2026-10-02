/**
 * Data a Xero sync left behind.
 *
 * Disconnecting stops new syncs but keeps what was imported, which surprised an owner whose
 * connection had landed on the wrong organisation. Xero ids are GUIDs and QuickBooks ids are
 * plain numbers, so "imported from Xero" can be told apart without a provider column and
 * without touching anything typed in by hand or synced from QuickBooks.
 */
export const XERO_ID_PATTERN = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
const RE = new RegExp(XERO_ID_PATTERN, 'i');

/** True for an id in Xero's format. */
export function isXeroId(externalId: string | null | undefined): boolean {
  return typeof externalId === 'string' && RE.test(externalId);
}

export type ImportedSummary = { customers: number; invoices: number; sampleCustomers: string[] };

/** What the notice says. */
export function describeImported(s: ImportedSummary): string | null {
  if (s.customers === 0 && s.invoices === 0) return null;
  const inv = `${s.invoices} invoice${s.invoices === 1 ? '' : 's'}`;
  const cus = `${s.customers} customer${s.customers === 1 ? '' : 's'}`;
  return `${inv} and ${cus} imported from Xero are still here.`;
}
