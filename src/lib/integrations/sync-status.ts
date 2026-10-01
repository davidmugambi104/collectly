/**
 * What status an invoice gets when it is synced from an accounting system.
 *
 * Two rules the syncs used to break:
 *  - A decision the owner made here (a dispute, a write-off) must survive the
 *    next sync while the invoice is still open at the source. The sync used to
 *    recompute the status from amounts and put a disputed invoice back to
 *    overdue, which restarted its reminders.
 *  - An invoice that is paid, voided or deleted at the source must stop being
 *    chased, even if it dropped out of the list of open invoices.
 */
export type LocalStatus = 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'disputed' | 'written_off';

export type SyncedStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'written_off';

const OPEN_AT_SOURCE = new Set<string>(['sent', 'viewed', 'partial', 'overdue']);
const OWNER_DECISIONS = new Set<string>(['disputed', 'written_off']);

/** From the amounts alone, which is all QuickBooks gives us. */
export function statusFromAmounts(o: { total: number; due: number; dueDate: Date; now: Date }): 'sent' | 'partial' | 'overdue' | 'paid' {
  const paid = Math.max(0, o.total - o.due);
  if (o.due === 0) return 'paid';
  if (paid > 0) return 'partial';
  return o.now > o.dueDate ? 'overdue' : 'sent';
}

/** Xero also tells us VOIDED, DELETED and DRAFT, which the amounts cannot. Those win over the amounts. */
export function xeroSyncedStatus(o: { xeroStatus: string | undefined; total: number; due: number; dueDate: Date; now: Date }): SyncedStatus {
  const s = (o.xeroStatus ?? '').toUpperCase();
  if (s === 'VOIDED' || s === 'DELETED') return 'written_off';
  if (s === 'DRAFT' || s === 'SUBMITTED') return 'draft';
  if (s === 'PAID') return 'paid';
  return statusFromAmounts(o);
}

/** The status to store for an invoice we already have. Paid or closed at the source always wins; an owner's dispute or write-off holds while it is still open. */
export function reconcileStatus(local: string | null | undefined, incoming: SyncedStatus): LocalStatus {
  if (local && OWNER_DECISIONS.has(local) && OPEN_AT_SOURCE.has(incoming)) return local as LocalStatus;
  return incoming;
}

/** Local invoices whose current state at the source we should look up by id: open here, but missing from the open list. */
export function needsLookup(localStatus: string): boolean {
  return localStatus !== 'paid' && localStatus !== 'written_off' && localStatus !== 'draft';
}
