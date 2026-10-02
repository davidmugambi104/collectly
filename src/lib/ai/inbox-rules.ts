/** Pure parts of reply classification: no AI call, no database. Relative imports only. */
import { z } from 'zod';

// Must match the live `reply_classification` Postgres enum exactly.
export const REPLY_CLASSIFICATIONS = [
  'will_pay_date',
  'already_paid',
  'disputed',
  'missing_po',
  'wrong_contact',
  'needs_payment_plan',
  'general_question',
  'no_action',
  'unclassified',
] as const;
export type ReplyClassification = (typeof REPLY_CLASSIFICATIONS)[number];

export type InboxClassification = {
  classification: ReplyClassification;
  confidence: number;
  summary: string;
  recommendedAction: string;
  suggestedPromiseDate: string | null;
};

const classificationSchema = z.object({
  classification: z.enum(REPLY_CLASSIFICATIONS),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(280),
  recommendedAction: z.string().min(1).max(280),
  suggestedPromiseDate: z.string().nullable(),
});

/** Validate the model's JSON text. Throws on anything that is not the agreed shape. */
export function parseModelClassification(text: string): InboxClassification {
  return classificationSchema.parse(JSON.parse(text));
}

/** What to store when the AI is unavailable: the reply still lands, for a human to triage. */
export function fallbackClassification(body: string): InboxClassification {
  return {
    classification: 'unclassified',
    confidence: 0,
    summary: body.slice(0, 200),
    recommendedAction: 'Review this reply manually.',
    suggestedPromiseDate: null,
  };
}

/** Out-of-office, bounces and list mail need no action and no AI call. */
export function autoReplyClassification(body: string): InboxClassification {
  const first = body.replace(/\s+/g, ' ').trim().slice(0, 200);
  return {
    classification: 'no_action',
    confidence: 1,
    summary: first ? `Automatic reply: ${first}` : 'Automatic reply with no text.',
    recommendedAction: 'No action needed. If this is a bounce, check the customer email address.',
    suggestedPromiseDate: null,
  };
}

/**
 * The model is asked for YYYY-MM-DD but has drifted ("ASAP", "next Friday").
 * Accept only a real calendar date in that format; anything else is null.
 */
export function parseValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return null;
  return d;
}
