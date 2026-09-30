/**
 * Replying to a customer from the Inbox. Pure helpers: who the reply may go
 * to, what it says, and how it is put into an email. No sending happens here.
 */
export const MAX_REPLY_CHARS = 5000;
const QUOTE_CHARS = 1500;

export function replySubject(original: string | null | undefined): string {
  const s = (original ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (!s) return 'Re: your message';
  return /^re:\s/i.test(s) ? s.slice(0, 200) : `Re: ${s}`.slice(0, 200);
}

/** Normalise line endings, trim, cap. Null if nothing is left to send. */
export function cleanReplyBody(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const t = input.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  return t ? t.slice(0, MAX_REPLY_CHARS) : null;
}

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export type ReplyTarget = { ok: true; to: string } | { ok: false; reason: string };

/**
 * Who a reply goes to: the address the customer wrote from, else their address
 * on file. Never anyone unsubscribed, and never a customer with no usable address.
 */
export function replyTarget(opts: { fromAddress: string | null; customerEmail: string | null; unsubscribedAt: Date | string | null }): ReplyTarget {
  if (opts.unsubscribedAt) return { ok: false, reason: 'This customer has unsubscribed, so Mugavi will not email them.' };
  const from = opts.fromAddress?.trim();
  if (from && EMAIL.test(from)) return { ok: true, to: from };
  const onFile = opts.customerEmail?.trim();
  if (onFile && EMAIL.test(onFile)) return { ok: true, to: onFile };
  return { ok: false, reason: 'There is no email address to reply to.' };
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Blank line = new paragraph, single newline = line break. Everything is escaped. */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px 0;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function renderReplyHtml(opts: { body: string; quotedFrom?: string | null; quoted?: string | null }): string {
  const quote = opts.quoted?.trim()
    ? `<blockquote style="margin:18px 0 0 0;padding:0 0 0 12px;border-left:3px solid #d9dbe1;color:#6c6e76;font-size:13px;">${
        opts.quotedFrom ? `<p style="margin:0 0 6px 0;">${escapeHtml(opts.quotedFrom)} wrote:</p>` : ''
      }${textToHtml(opts.quoted.trim().slice(0, QUOTE_CHARS))}</blockquote>`
    : '';
  return `<!doctype html><html><body style="font-family:-apple-system,system-ui,sans-serif;color:#16171c;max-width:600px;margin:0 auto;padding:24px;font-size:15px;line-height:1.6;">${textToHtml(opts.body)}${quote}</body></html>`;
}
