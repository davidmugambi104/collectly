/** Who a statement may go to: the address on file, and never someone who has unsubscribed. */
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export type StatementTarget = { ok: true; to: string } | { ok: false; reason: string };

export function statementTarget(o: { email: string | null | undefined; unsubscribedAt: Date | string | null | undefined }): StatementTarget {
  if (o.unsubscribedAt) return { ok: false, reason: 'This customer has unsubscribed, so Mugavi will not email them.' };
  const to = o.email?.trim();
  if (!to || !EMAIL.test(to)) return { ok: false, reason: 'There is no email address on file for this customer.' };
  return { ok: true, to };
}
