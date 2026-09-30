/**
 * "Send as": a step can go out under a different name, and, when the
 * organisation has a verified sending domain, from a different address on it
 * (for example accounts@ for the first reminder and a person's name for the
 * last). It changes the From line only. Replies still come to the Inbox, and
 * we do not connect to anyone's own mailbox.
 */
import { cleanSenderName } from '../email-from.ts';
import { normalizeLocalPart } from '../email-domain.ts';

export type StepSender = { name: string | null; localPart: string | null };

/** What a step's saved fields ask for. Anything unusable is dropped, not guessed at. */
export function senderFromStep(step: { senderName?: string | null; senderLocalPart?: string | null } | null | undefined): StepSender | null {
  if (!step) return null;
  const name = cleanSenderName(step.senderName) || null;
  const raw = typeof step.senderLocalPart === 'string' ? step.senderLocalPart.trim() : '';
  const localPart = raw ? normalizeLocalPart(raw) : null;
  return name || localPart ? { name, localPart } : null;
}

/** A short key for caching a resolved From line per sender. */
export function senderKey(s: StepSender | null): string {
  return s ? `${s.name ?? ''}|${s.localPart ?? ''}` : '';
}
