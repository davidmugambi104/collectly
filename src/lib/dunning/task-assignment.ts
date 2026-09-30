/**
 * Who a call task is assigned to, and which tasks a given view shows.
 * Pure, so the rules can be tested without a database or the sign-in provider.
 */
export type OrgMember = { id: string; name: string };

export type TaskView = 'all' | 'me' | 'unassigned';

export function parseTaskView(v: string | undefined): TaskView {
  return v === 'me' || v === 'unassigned' ? v : 'all';
}

/** The member an assignment request points at, or null if they are not in this organisation. */
export function findMember(members: OrgMember[], id: unknown): OrgMember | null {
  if (typeof id !== 'string' || !id) return null;
  return members.find((m) => m.id === id) ?? null;
}

/** A label for a member from what the sign-in provider gives us. Never empty. */
export function memberLabel(first: string | null | undefined, last: string | null | undefined, fallback: string | null | undefined): string {
  const full = [first, last].map((s) => s?.trim()).filter(Boolean).join(' ');
  return full || fallback?.trim() || 'Team member';
}
