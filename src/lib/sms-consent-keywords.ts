/**
 * Classify an inbound SMS reply.
 *
 * Pure and import-free so the node test runner can load it -- same reason
 * src/lib/legacy-domain.ts and src/lib/invalid-fields.ts are separate.
 *
 * The keyword sets are Twilio's own reserved words, not ones we invented.
 * Twilio intercepts STOP/HELP at the carrier level before the message reaches
 * us, so our copy of them is a belt-and-braces local record rather than the
 * primary mechanism -- but it has to agree with Twilio's list, or our database
 * will disagree with what the carrier actually did.
 *
 * https://help.twilio.com/articles/223134027 (opt-out keywords)
 */
export type SmsIntent = 'opt_in' | 'opt_out' | 'help' | 'unknown';

// Twilio's opt-out set. STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT all carrier-level.
const OPT_OUT = new Set(['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit', 'revoke', 'optout']);
// Twilio's opt-in set, plus YES, which is what our invite actually asks for.
const OPT_IN = new Set(['yes', 'start', 'unstop', 'join', 'y', 'optin']);
const HELP = new Set(['help', 'info']);

/**
 * Normalise before matching: carriers and keyboards add punctuation, case and
 * whitespace, and a reply of "YES." or " stop " must count. Only the first
 * word is considered -- "yes please" is a yes, but "stop sending invoices to
 * the wrong address" is not an opt-out, it is a sentence that happens to start
 * with the word, so bare-word-only matching would be wrong in the other
 * direction. Twilio's own rule is the whole message must be the keyword, and
 * that is what this follows.
 */
export function classifyInboundSms(body: string | null | undefined): SmsIntent {
  const normalised = (body ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s ]+/g, ' ')
    .replace(/[.!,;:'"()\[\]]/g, '')
    .trim();

  if (!normalised) return 'unknown';
  if (OPT_OUT.has(normalised)) return 'opt_out';
  if (OPT_IN.has(normalised)) return 'opt_in';
  if (HELP.has(normalised)) return 'help';
  return 'unknown';
}
