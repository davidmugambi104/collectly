/**
 * Unit-cost constants for the usage meter (/dashboard/admin/usage).
 *
 * EVERY NUMBER IN THIS FILE IS AN ESTIMATE, not an invoice line. They are
 * rounded UP on purpose, so the meter overstates cost a little rather than
 * flatters the margin. They were written from memory of public list prices and
 * have NOT been checked against a live bill. Verify and edit them here:
 *
 *   Email  (Resend)  https://resend.com/pricing        per-email cost depends on
 *                    your plan; divide the plan price by its included volume,
 *                    or use the overage rate if you are above it.
 *   AI     (Gemini)  https://ai.google.dev/gemini-api/docs/pricing   input and
 *                    output tokens per million, per model. The per-call figure
 *                    below assumes a short prompt and a short answer.
 *   SMS    (Twilio)  https://www.twilio.com/en-us/sms/pricing/us   per-segment
 *                    price PLUS carrier fees and any toll-free surcharge. The
 *                    Twilio console usage page shows the real all-in figure.
 *
 * Units are micro-dollars (1 USD = 1,000,000). Integers only, so sums never
 * drift. History is not rewritten when you edit a constant: the cost is stored
 * on each row at the time it was recorded.
 */

export const MICROS_PER_USD = 1_000_000;

/** Cost of one email through Resend. ESTIMATE, rounded up (about $0.001). */
export const EMAIL_COST_MICROS = 1_000;

/**
 * Cost of one AI call by model, per call. ESTIMATE, rounded up.
 * Key is the model id the code passes to Gemini. An unknown model uses `default`.
 */
export const AI_COST_MICROS_PER_CALL: Record<string, number> = {
  // flash-lite class: well under a tenth of a cent per short call; rounded up.
  'gemini-flash-lite-latest': 500,
  default: 2_000,
};

/** Cost of one SMS segment through Twilio, carrier fees included. ESTIMATE, rounded up (about $0.015). */
export const SMS_SEGMENT_COST_MICROS = 15_000;

/** The model the code calls today, used when a call site does not name one. */
export const DEFAULT_AI_MODEL = 'gemini-flash-lite-latest';
