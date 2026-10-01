/**
 * What happened on a call, written down when a call task is closed. Optional:
 * closing a task without a note still works. Pure, so the choices and limits
 * can be tested.
 */
export const CALL_OUTCOMES = ['reached', 'left_message', 'no_answer', 'wrong_number'] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  reached: 'Spoke to them',
  left_message: 'Left a message',
  no_answer: 'No answer',
  wrong_number: 'Wrong or dead number',
};

export const MAX_CALL_NOTE = 1000;

export type CallOutcomeInput = { outcome: CallOutcome | null; note: string | null };

/** Anything unrecognised is dropped, not guessed at. Both empty means nothing to record. */
export function parseCallOutcome(outcome: unknown, note: unknown): CallOutcomeInput {
  const o = typeof outcome === 'string' && (CALL_OUTCOMES as readonly string[]).includes(outcome) ? (outcome as CallOutcome) : null;
  const n = typeof note === 'string'
    ? note.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, MAX_CALL_NOTE) || null
    : null;
  return { outcome: o, note: n };
}

export function hasOutcome(i: CallOutcomeInput): boolean {
  return i.outcome !== null || i.note !== null;
}

/** The line shown on the customer timeline. */
export function callTimelineTitle(i: CallOutcomeInput, invoiceNumber: string): string {
  return `Call about ${invoiceNumber}${i.outcome ? `: ${CALL_OUTCOME_LABELS[i.outcome].toLowerCase()}` : ''}`;
}
