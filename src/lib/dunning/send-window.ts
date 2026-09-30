/**
 * Send windows: only act during the owner's business hours.
 *
 * The window is read in the owner's own timezone, so "9 to 5 on weekdays" means
 * 9 to 5 where they are, across daylight-saving changes. Pure logic, no
 * database, no dependencies: Intl does the timezone arithmetic.
 *
 * What a window governs: the scheduler's work for an org (drafting reminders in
 * approval mode, sending them in automatic mode). Approving a draft by hand is
 * an owner's explicit act and is not held back.
 */

/** Monday = 1, Tuesday = 2, Wednesday = 4, ..., Sunday = 64. */
export const DAY_BITS = { mon: 1, tue: 2, wed: 4, thu: 8, fri: 16, sat: 32, sun: 64 } as const;
export const WEEKDAYS = 31;
export const ALL_DAYS = 127;

export type SendWindow = {
  enabled: boolean;
  /** Local hour the window opens, 0-23. */
  startHour: number;
  /** Local hour it closes, 1-24 (24 means the end of the day). Exclusive. */
  endHour: number;
  /** Bitmask of DAY_BITS. */
  days: number;
  /** IANA timezone, e.g. "America/New_York". */
  timezone: string;
};

export const DEFAULT_WINDOW: SendWindow = { enabled: false, startHour: 9, endHour: 17, days: WEEKDAYS, timezone: 'UTC' };

export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Local weekday (Monday = 0) and hour (0-23) of an instant in a timezone. */
export function localParts(date: Date, timezone: string): { weekday: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { weekday: WEEKDAY_INDEX[get('weekday')] ?? 0, hour: parseInt(get('hour'), 10) % 24, minute: parseInt(get('minute'), 10) };
}

/** With the window off, every moment counts as inside it. */
export function isWithinWindow(now: Date, w: SendWindow): boolean {
  if (!w.enabled) return true;
  const { weekday, hour } = localParts(now, w.timezone);
  if (!(w.days & (1 << weekday))) return false;
  return hour >= w.startHour && hour < w.endHour;
}

/** The first moment at or after `now` that is inside the window, to the minute. Null if it never opens. */
export function nextWindowOpen(now: Date, w: SendWindow): Date | null {
  if (isWithinWindow(now, w)) return now;
  if (!w.enabled || !(w.days & ALL_DAYS)) return null;
  const start = new Date(Math.floor(now.getTime() / 60000) * 60000);
  // Fifteen-minute steps for eight days covers every weekday pattern and any
  // daylight-saving shift, and the answer is then walked back to the minute.
  for (let i = 1; i <= 8 * 24 * 4; i++) {
    const t = new Date(start.getTime() + i * 15 * 60000);
    if (isWithinWindow(t, w)) {
      let m = t;
      while (isWithinWindow(new Date(m.getTime() - 60000), w)) m = new Date(m.getTime() - 60000);
      return m;
    }
  }
  return null;
}

export type ParsedWindow = { ok: true; value: SendWindow } | { ok: false; error: string };

/** Validate untrusted input from the settings form. */
export function parseWindowInput(input: unknown, fallbackTimezone = 'UTC'): ParsedWindow {
  if (!input || typeof input !== 'object') return { ok: false, error: 'window settings are missing' };
  const o = input as Record<string, unknown>;
  const enabled = o.enabled === true;
  const startHour = Number(o.startHour);
  const endHour = Number(o.endHour);
  const days = Number(o.days);
  const timezone = typeof o.timezone === 'string' && o.timezone.trim() ? o.timezone.trim() : fallbackTimezone;

  if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) return { ok: false, error: 'start hour must be 0 to 23' };
  if (!Number.isInteger(endHour) || endHour < 1 || endHour > 24) return { ok: false, error: 'end hour must be 1 to 24' };
  if (endHour <= startHour) return { ok: false, error: 'the window must end after it starts' };
  if (!Number.isInteger(days) || days < 1 || days > ALL_DAYS) return { ok: false, error: 'choose at least one day' };
  if (!isValidTimezone(timezone)) return { ok: false, error: 'that timezone is not recognised' };
  return { ok: true, value: { enabled, startHour, endHour, days, timezone } };
}
