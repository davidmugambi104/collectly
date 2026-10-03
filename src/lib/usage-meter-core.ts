/**
 * Pure part of the usage meter: kinds, cost maths, SMS segment counting and a
 * fail-open recorder that takes its writer as an argument. No database import,
 * so it can be tested on its own. The database-bound wrapper is usage-meter.ts.
 *
 * What a row may hold: an org id, a kind, a unit count, a model id, a cost and
 * a timestamp. Nothing else can be passed in, and the org id and model are
 * checked to look like ids, so an email address or a name handed in by mistake
 * is dropped, not stored.
 */
import { AI_COST_MICROS_PER_CALL, DEFAULT_AI_MODEL, EMAIL_COST_MICROS, SMS_SEGMENT_COST_MICROS } from './usage-costs.ts';

export const USAGE_KINDS = [
  'email_sent', // a reminder email to the customer (scheduler, approval, manual send)
  'extra_recipient_email', // a copy to an additional recipient
  'statement_email', // a statement email
  'inbox_reply_email', // an owner's reply from the inbox
  'test_email', // a test reminder from the dunning test route
  'ai_draft', // Gemini wrote a reminder
  'ai_reply_classify', // Gemini classified an inbound reply
  'ai_forecast', // Gemini wrote the cash-flow forecast
  'sms_sent', // a reminder SMS (units = segments)
  'sms_consent_sms', // opt-in invite, confirmation or HELP reply (units = segments)
] as const;
export type UsageKind = (typeof USAGE_KINDS)[number];

const AI_KINDS = new Set<UsageKind>(['ai_draft', 'ai_reply_classify', 'ai_forecast']);
const SMS_KINDS = new Set<UsageKind>(['sms_sent', 'sms_consent_sms']);

export const MAX_UNITS = 1000;
/** Longest we will wait on the database before giving up on a record. */
export const RECORD_TIMEOUT_MS = 1500;

export type UsageInput = { orgId: string; kind: UsageKind; units?: number; model?: string };
export type UsageRow = { orgId: string; kind: UsageKind; units: number; model: string | null; costMicros: number };
export type UsageWriter = (row: UsageRow) => Promise<void>;

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MODEL_RE = /^[A-Za-z0-9._-]{1,64}$/;

/** Estimated cost in micro-dollars. Always a non-negative integer. */
export function estimateCostMicros(kind: UsageKind, units = 1, model?: string | null): number {
  const n = Number.isFinite(units) ? Math.max(0, Math.ceil(units)) : 1;
  if (AI_KINDS.has(kind)) {
    const per = (model && AI_COST_MICROS_PER_CALL[model]) || AI_COST_MICROS_PER_CALL[DEFAULT_AI_MODEL] || AI_COST_MICROS_PER_CALL.default;
    return per * n;
  }
  if (SMS_KINDS.has(kind)) return SMS_SEGMENT_COST_MICROS * n;
  return EMAIL_COST_MICROS * n;
}

/**
 * How many SMS segments a message of this text takes. Only the count leaves
 * this function; the text is never stored. GSM-7 text is 160 chars, or 153 per
 * part when it spans several; anything outside GSM-7 (emoji, curly quotes) is
 * UCS-2: 70 chars, or 67 per part. The GSM-7 extension characters count as two.
 */
const GSM7 = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXT = '^{}\\[~]|€\f';
export function smsSegments(text: string): number {
  if (!text) return 1;
  let gsmLen = 0;
  let gsm = true;
  for (const ch of text) {
    if (GSM7.includes(ch)) gsmLen += 1;
    else if (GSM7_EXT.includes(ch)) gsmLen += 2;
    else { gsm = false; break; }
  }
  if (gsm) return gsmLen <= 160 ? 1 : Math.ceil(gsmLen / 153);
  const len = [...text].reduce((n, ch) => n + ((ch.codePointAt(0) ?? 0) > 0xffff ? 2 : 1), 0);
  return len <= 70 ? 1 : Math.ceil(len / 67);
}

/** Validate and price an input. Returns null when it cannot be stored safely. */
export function buildUsageRow(input: UsageInput): UsageRow | null {
  if (!input || typeof input.orgId !== 'string' || !ID_RE.test(input.orgId)) return null;
  if (!(USAGE_KINDS as readonly string[]).includes(input.kind)) return null;
  const rawUnits = input.units === undefined ? 1 : Math.ceil(Number(input.units));
  const units = Number.isFinite(rawUnits) ? Math.min(MAX_UNITS, Math.max(1, rawUnits)) : 1;
  const model = AI_KINDS.has(input.kind) ? (input.model && MODEL_RE.test(input.model) ? input.model : DEFAULT_AI_MODEL) : null;
  return { orgId: input.orgId, kind: input.kind, units, model, costMicros: estimateCostMicros(input.kind, units, model) };
}

/**
 * Record one usage event. FAILS OPEN: never throws, never rejects, and gives
 * up after RECORD_TIMEOUT_MS so a slow database cannot hold a send. Returns
 * true only when the row was written.
 */
export async function recordUsageWith(write: UsageWriter, input: UsageInput, timeoutMs = RECORD_TIMEOUT_MS): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const row = buildUsageRow(input);
    if (!row) return false;
    const timeout = new Promise<false>((resolve) => { timer = setTimeout(() => resolve(false), timeoutMs); });
    const done = (async () => { await write(row); return true as const; })().catch(() => false as const);
    return await Promise.race([done, timeout]);
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
