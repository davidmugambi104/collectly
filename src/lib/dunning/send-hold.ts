/**
 * The hold before a reminder is sent by hand. Pressing send starts a countdown;
 * Undo before it ends and nothing is sent. The countdown runs in the browser, so
 * closing the page cancels it. That fails safe: the reminder stays where it was.
 */
export const HOLD_SECONDS = 30;

export function holdEndsAt(startedAt: number, seconds: number = HOLD_SECONDS): number {
  return startedAt + seconds * 1000;
}

/** Whole seconds left, rounded up so the label reads 30 at the start and 1 just before it fires. */
export function holdSecondsLeft(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function holdIsOver(endsAt: number, now: number): boolean {
  return now >= endsAt;
}
