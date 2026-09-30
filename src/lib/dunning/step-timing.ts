/**
 * A reminder step sits on a day relative to the due date. Negative days mean
 * before it ("a heads-up a week ahead"), 0 the due date itself, positive days
 * after it. One place says that in words, so the editor, the explainer and the
 * approval queue never disagree.
 */
export const MAX_LEAD_DAYS = 30;

const plural = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/** For a sentence: "7 days before the due date". */
export function stepDayPhrase(daysFromDue: number): string {
  if (daysFromDue < 0) return `${plural(-daysFromDue)} before the due date`;
  if (daysFromDue === 0) return 'on the due date';
  return `${plural(daysFromDue)} past due`;
}

/** For a step tile: "7 days before", "Due date", "Day 14". */
export function stepDayLabel(daysFromDue: number): string {
  if (daysFromDue < 0) return `${plural(-daysFromDue)} before`;
  if (daysFromDue === 0) return 'Due date';
  return `Day ${daysFromDue}`;
}

/** How many days ahead of the due date the earliest step reaches; 0 if none looks ahead. */
export function leadDays(steps: Array<{ daysFromDue: number }> | null | undefined): number {
  const min = Math.min(0, ...(steps ?? []).map((s) => s.daysFromDue));
  return Math.min(MAX_LEAD_DAYS, -min) || 0; // || 0 turns -0 into 0
}

/** Whole days from now until the due date, for wording a heads-up. 0 if it is due already. */
export function daysUntilDue(dueDate: Date | string, now: Date): number {
  return Math.max(0, Math.ceil((new Date(dueDate).getTime() - now.getTime()) / 86_400_000));
}
