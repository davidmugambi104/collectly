/**
 * Extra people who also get a customer's reminders and statements, for example
 * an accounts-payable contact next to the owner. Pure rules only.
 *
 * Each extra person gets their own email, not a Cc, so each one has their own
 * unsubscribe link and their own opt-out. Someone who has unsubscribed, or whose
 * address is on the suppression list, is never copied.
 */
export const MAX_RECIPIENTS = 5;

const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const e = input.trim().toLowerCase();
  return e.length <= 254 && EMAIL.test(e) ? e : null;
}

export type RecipientInput = { email: string; name: string | null };
export type RecipientResult = { ok: true; value: RecipientInput } | { ok: false; error: string };

export function parseRecipientInput(input: unknown, primaryEmail: string | null | undefined): RecipientResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Send an email address.' };
  const r = input as Record<string, unknown>;
  const email = normalizeEmail(r.email);
  if (!email) return { ok: false, error: 'That does not look like an email address.' };
  if (primaryEmail && email === primaryEmail.trim().toLowerCase()) return { ok: false, error: 'That is already this customer\'s main email.' };
  let name: string | null = null;
  if (typeof r.name === 'string') {
    name = r.name.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || null;
  }
  return { ok: true, value: { email, name } };
}

export type StoredRecipient = { email: string; unsubscribedAt: Date | string | null };

/** Who gets a copy: every stored recipient except the primary, anyone unsubscribed, anyone suppressed, and duplicates. */
export function pickCopyTargets(primaryEmail: string | null | undefined, recipients: StoredRecipient[], suppressed: Set<string>): string[] {
  const primary = primaryEmail?.trim().toLowerCase() ?? '';
  const out: string[] = [];
  for (const r of recipients) {
    const e = normalizeEmail(r.email);
    if (!e || e === primary || r.unsubscribedAt || suppressed.has(e) || out.includes(e)) continue;
    out.push(e);
  }
  return out.slice(0, MAX_RECIPIENTS);
}
