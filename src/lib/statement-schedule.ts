/**
 * Monthly statement drafts. The scheduler only ever creates DRAFTS that wait for
 * the owner's approval; nothing is emailed until a person approves it. These are
 * the pure rules: which month a draft belongs to, when it is due, and who
 * qualifies, so each can be tested without a database.
 */
export const MIN_DAY = 1;
export const MAX_DAY = 28; // every month has a 28th, so "on the 31st" can never skip a month

export type StatementSchedule = { enabled: boolean; day: number };
export const DEFAULT_SCHEDULE: StatementSchedule = { enabled: false, day: 1 };

/** The month a draft belongs to, in UTC, e.g. "2026-10". One draft per customer per period. */
export function statementPeriod(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** On or after the chosen day of the month. A missed day (cron down) is made up on the next run, once. */
export function isStatementDay(now: Date, day: number): boolean {
  return now.getUTCDate() >= day;
}

export type ScheduleResult = { ok: true; value: StatementSchedule } | { ok: false; error: string };

export function parseScheduleInput(input: unknown): ScheduleResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Statement settings must be an object.' };
  const r = input as Record<string, unknown>;
  if (typeof r.enabled !== 'boolean') return { ok: false, error: 'Say whether monthly statements are on or off.' };
  const day = Number(r.day);
  if (!Number.isInteger(day) || day < MIN_DAY || day > MAX_DAY) return { ok: false, error: `Choose a day of the month from ${MIN_DAY} to ${MAX_DAY}.` };
  return { ok: true, value: { enabled: r.enabled, day } };
}

/**
 * Whether a customer gets a statement draft this month: they have an address, have not
 * unsubscribed, are not on a hold ("leave it with me"), and actually have something overdue.
 * A customer who owes money that is not yet late does not get a monthly statement.
 */
export function shouldDraftStatement(c: { email: string | null | undefined; unsubscribedAt: Date | string | null | undefined; onHold: boolean; overdueCents: number }): boolean {
  if (!c.email || !c.email.trim()) return false;
  if (c.unsubscribedAt) return false;
  if (c.onHold) return false;
  return c.overdueCents > 0;
}
