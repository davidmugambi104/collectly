/**
 * What a paying customer may do from the payment page without an account:
 * say when they will pay, or say something is wrong. Both pause the chasing and
 * tell the owner. Pure rules here; the routes do the writing.
 */
export const PROMISE_MAX_DAYS = 30;
export const MAX_NOTE_CHARS = 1000;

/** Invoices a customer can still act on. Closed, paid and already-disputed ones cannot be touched from a public link. */
const ACTIONABLE = new Set(['sent', 'viewed', 'overdue', 'partial']);
export const canSelfServe = (status: string) => ACTIONABLE.has(status);

export type PromiseDateResult = { ok: true; date: Date } | { ok: false; error: string };

/**
 * "YYYY-MM-DD" from a date picker, between today and PROMISE_MAX_DAYS ahead.
 * The promise runs to the end of that day, UTC, so "Friday" is still Friday
 * when the scheduler next looks.
 */
export function parsePromiseDate(input: unknown, now: Date): PromiseDateResult {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return { ok: false, error: 'Pick a date.' };
  const d = new Date(`${input}T23:59:59.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== input) return { ok: false, error: 'That is not a real date.' };
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
  if (d.getTime() < todayEnd.getTime()) return { ok: false, error: 'Pick today or a day ahead.' };
  if (d.getTime() > todayEnd.getTime() + PROMISE_MAX_DAYS * 86_400_000) return { ok: false, error: `Pick a date within ${PROMISE_MAX_DAYS} days. For longer, please write to us.` };
  return { ok: true, date: d };
}

/** The reasons a customer can give. Values match the live dispute_reason enum. */
export const PORTAL_REASONS = [
  { value: 'already_paid', label: 'I have already paid this' },
  { value: 'amount_incorrect', label: 'The amount looks wrong' },
  { value: 'need_invoice_copy', label: 'I need a copy of the invoice' },
  { value: 'missing_po', label: 'It needs a PO number' },
  { value: 'payment_plan_request', label: 'I would like to pay in parts' },
  { value: 'other', label: 'Something else' },
] as const;

export function parsePortalReason(input: unknown): string | null {
  return PORTAL_REASONS.find((r) => r.value === input)?.value ?? null;
}

export function cleanNote(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const t = input.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  return t ? t.slice(0, MAX_NOTE_CHARS) : null;
}

export const reasonLabel = (value: string) => PORTAL_REASONS.find((r) => r.value === value)?.label ?? value.replace(/_/g, ' ');

/** The calendar day the customer chose, whatever time zone the viewer is in. */
export const utcDay = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
