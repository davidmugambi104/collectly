/**
 * Chasing rules an owner can set, learned from how Chaser words its own:
 * "do not chase a customer more than once per N days" and "do not chase
 * invoices with a balance below X". Pure, so the scheduler, the explainer and
 * the settings screen can all use the same two checks.
 */
export type ChaseRules = {
  /** At most one new reminder per customer in this many days, across all their invoices. 0 turns it off. */
  minGapDays: number;
  /** Do not chase an invoice whose balance is below this. 0 turns it off. */
  minBalance: number;
};

export const DEFAULT_RULES: ChaseRules = { minGapDays: 7, minBalance: 0 };
export const MAX_GAP_DAYS = 60;
export const MAX_MIN_BALANCE = 1_000_000;

export type RulesResult = { ok: true; value: ChaseRules } | { ok: false; error: string };

export function parseRulesInput(input: unknown): RulesResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Chasing rules must be an object.' };
  const raw = input as Record<string, unknown>;
  const gap = Number(raw.minGapDays);
  const bal = Number(raw.minBalance);
  if (!Number.isInteger(gap) || gap < 0 || gap > MAX_GAP_DAYS) {
    return { ok: false, error: `Days between reminders must be a whole number from 0 to ${MAX_GAP_DAYS}.` };
  }
  if (!Number.isFinite(bal) || bal < 0 || bal > MAX_MIN_BALANCE) {
    return { ok: false, error: `Minimum balance must be an amount from 0 to ${MAX_MIN_BALANCE.toLocaleString('en-US')}.` };
  }
  return { ok: true, value: { minGapDays: gap, minBalance: Math.round(bal * 100) / 100 } };
}

/** What a customer's earlier reminders look like to the gap rule. */
export type RecentReminder = { invoiceId: string; at: Date | string };

/**
 * When the customer may next be chased about `invoiceId`, or null if they may be now.
 * Only reminders about OTHER invoices count: an invoice's own steps keep their
 * own cadence, so a customer with one invoice sees no change at all. What this
 * stops is three overdue invoices becoming three emails on the same day.
 */
export function gapBlockedUntil(recent: RecentReminder[], invoiceId: string, gapDays: number): Date | null {
  if (gapDays <= 0) return null;
  let latest = 0;
  for (const r of recent) {
    if (r.invoiceId === invoiceId) continue;
    latest = Math.max(latest, new Date(r.at).getTime());
  }
  return latest ? new Date(latest + gapDays * 86_400_000) : null;
}

export function isGapBlocked(recent: RecentReminder[], invoiceId: string, gapDays: number, now: Date): boolean {
  const until = gapBlockedUntil(recent, invoiceId, gapDays);
  return until !== null && until.getTime() > now.getTime();
}

export function belowMinBalance(balance: number, min: number): boolean {
  return min > 0 && balance < min;
}

/** Statuses of an earlier run that mean the customer was, or is about to be, contacted. Failed and cancelled runs reached no one. */
export const CONTACTING_STATUSES = ['scheduled', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'paid'] as const;
