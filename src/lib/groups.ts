/** Customer group rules that need no database. */

export const MAX_GROUP_NAME = 60;

/** Trim, collapse whitespace, strip control characters. Null if nothing usable is left. */
export function normalizeGroupName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const n = input.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!n) return null;
  return n.slice(0, MAX_GROUP_NAME);
}

export type StarterStep = { id: string; daysFromDue: number; channel: 'email' | 'sms' | 'phone'; tone: 'friendly' | 'firm' | 'final'; subject?: string; template: string };

/**
 * A new group starts as a copy of the organisation's own schedule so it is
 * never empty. If the org has none yet, this small email-only schedule is used.
 * Step ids are regenerated so the copy shares nothing with the original.
 */
export const FALLBACK_STEPS: StarterStep[] = [
  { id: 's1', daysFromDue: 1, channel: 'email', tone: 'friendly', template: '' },
  { id: 's2', daysFromDue: 7, channel: 'email', tone: 'firm', template: '' },
  { id: 's3', daysFromDue: 21, channel: 'email', tone: 'final', template: '' },
];

export function copySteps(source: StarterStep[] | null | undefined): StarterStep[] {
  const steps = source && source.length ? source : FALLBACK_STEPS;
  return steps.map((s, i) => ({ ...s, id: `s${i + 1}` }));
}
