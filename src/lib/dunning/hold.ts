/**
 * Owner-set hold on automatic reminders for one customer.
 *
 * This is deliberately NOT customers.dnd_at. dnd_at is the compliance switch:
 * a customer unsubscribing, or a hard bounce or spam complaint, sets it, and
 * nothing in the app may clear it. A hold is the owner saying "I've spoken to
 * them, leave it with me", which the owner must be able to lift. Keeping the
 * two apart means resuming reminders can never re-enable someone who opted out.
 *
 * Pure logic only, so the rules are testable without a database.
 */

/** Longest hold the API will accept. A hold with no end date is still allowed. */
export const MAX_HOLD_DAYS = 365;

const DAY_MS = 86_400_000;

export type HoldLike = { heldUntil: Date | string | null } | null | undefined;

/**
 * A hold with no end date lasts until the owner lifts it. One with an end date
 * lasts up to that instant, then reminders resume on their own.
 */
export function isHoldActive(hold: HoldLike, now: Date = new Date()): boolean {
  if (!hold) return false;
  if (hold.heldUntil === null) return true;
  const until = hold.heldUntil instanceof Date ? hold.heldUntil : new Date(hold.heldUntil);
  if (Number.isNaN(until.getTime())) return true; // unreadable date: fail safe, do not chase
  return until.getTime() > now.getTime();
}

export type ParsedHoldUntil =
  | { ok: true; value: Date | null }
  | { ok: false; error: string };

/**
 * Accepts a YYYY-MM-DD date (what an <input type="date"> sends), an ISO
 * timestamp, or nothing. A bare date holds through the end of that day (UTC),
 * so "pause until Friday" includes Friday.
 */
export function parseHoldUntil(input: unknown, now: Date = new Date()): ParsedHoldUntil {
  if (input === undefined || input === null || input === '') return { ok: true, value: null };
  if (typeof input !== 'string') return { ok: false, error: 'heldUntil must be a date string' };

  const trimmed = input.trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const parsed = new Date(dateOnly ? `${trimmed}T23:59:59.999Z` : trimmed);
  if (Number.isNaN(parsed.getTime())) return { ok: false, error: 'heldUntil is not a valid date' };
  if (parsed.getTime() <= now.getTime()) return { ok: false, error: 'heldUntil must be in the future' };
  if (parsed.getTime() - now.getTime() > MAX_HOLD_DAYS * DAY_MS) {
    return { ok: false, error: `heldUntil can be at most ${MAX_HOLD_DAYS} days away` };
  }
  return { ok: true, value: parsed };
}

/** Trim and cap a free-text reason. Empty becomes null. */
export function cleanHoldReason(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const t = input.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return t ? t.slice(0, 200) : null;
}
