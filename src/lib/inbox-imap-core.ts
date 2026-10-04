/**
 * The IMAP reply-inbox poll, with no database and no AI in it.
 *
 * src/lib/inbox-imap-poll.ts wires this to the real tables; the tests wire it
 * to a stand-in IMAP server and in-memory fakes. Relative imports only, so
 * node --test can load it.
 */
import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';

export type ImapConfig = {
  host: string;
  port: number;
  secure: boolean;
  /** Only used when secure is false: never upgrade to TLS (local stand-ins). */
  plainOnly: boolean;
  user: string;
  pass: string;
  mailbox: string;
};

/**
 * Read the AR_DUNNING_IMAP_* variables. Returns null when the user or app
 * password is missing (the poll then no-ops). Defaults are Zoho over implicit
 * TLS on 993, which is what production uses.
 * AR_DUNNING_IMAP_PORT and AR_DUNNING_IMAP_TLS=off exist so a local stand-in
 * server can be used; leave them unset for a real mailbox.
 */
export function resolveImapConfig(env: Record<string, string | undefined>): ImapConfig | null {
  const user = env.AR_DUNNING_IMAP_USER?.trim();
  const pass = env.AR_DUNNING_IMAP_APP_PASSWORD?.trim();
  if (!user || !pass) return null;
  const tlsOff = (env.AR_DUNNING_IMAP_TLS ?? '').trim().toLowerCase() === 'off';
  const portRaw = Number(env.AR_DUNNING_IMAP_PORT);
  const port = Number.isInteger(portRaw) && portRaw > 0 && portRaw < 65536 ? portRaw : tlsOff ? 143 : 993;
  return {
    host: env.AR_DUNNING_IMAP_HOST?.trim() || 'imap.zoho.com',
    port,
    secure: !tlsOff,
    plainOnly: tlsOff,
    user,
    pass,
    mailbox: env.AR_DUNNING_IMAP_MAILBOX?.trim() || 'INBOX',
  };
}

/** Message ids a reply points back to, from In-Reply-To and References. */
export function extractCandidateMessageIds(parsed: Pick<ParsedMail, 'inReplyTo' | 'references'>): string[] {
  const ids: string[] = [];
  if (parsed.inReplyTo) ids.push(parsed.inReplyTo);
  const refs = parsed.references;
  if (refs) {
    if (Array.isArray(refs)) ids.push(...refs);
    else ids.push(...String(refs).split(/\s+/));
  }
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export type ParsedReply = {
  candidateIds: string[];
  fromAddress: string;
  fromName: string | null;
  subject: string;
  /** The reply text with the quoted original and signature removed. */
  body: string;
  autoReply: boolean;
  messageId: string | null;
};

const AUTO_SUBJECT = /^(?:(?:automatic|auto)[ -]?reply|autoreply|out of (?:the )?office|undeliverable|delivery (?:status notification|has failed)|mail delivery (?:failed|subsystem)|returned mail|failure notice)\b/i;
const AUTO_SENDER = /^(?:mailer-daemon|postmaster|no-?reply|do-?not-?reply)@/i;

/** Machine mail (out of office, bounces, list mail) that no human needs to triage. */
export function isAutoReply(headers: { get(name: string): unknown }, fromAddress: string, subject: string): boolean {
  const auto = headers.get('auto-submitted');
  if (typeof auto === 'string' && auto.trim().toLowerCase() !== 'no') return true;
  const precedence = headers.get('precedence');
  if (typeof precedence === 'string' && /^(bulk|junk|auto_reply|list)$/i.test(precedence.trim())) return true;
  if (headers.get('x-autoreply') || headers.get('x-autorespond')) return true;
  if (AUTO_SENDER.test(fromAddress)) return true;
  return AUTO_SUBJECT.test(subject.trim());
}

/**
 * Keep what the customer typed. Drops the quoted original (lines starting with
 * ">"), the "On ... wrote:" lead-in, Outlook's "From:/Sent:" header block and
 * the "-- " signature. If that would leave nothing, the full text is kept so
 * a reply is never turned into an empty message.
 */
export function stripQuotedReply(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^--\s*$/.test(line)) break;
    if (/^-{2,}\s*(original message|forwarded message)\s*-{2,}\s*$/i.test(line.trim())) break;
    if (/^on .{5,200}wrote:\s*$/i.test(line.trim())) break;
    if (/^on .{5,200}$/i.test(line.trim()) && /wrote:\s*$/i.test((lines[i + 1] ?? '').trim())) break;
    if (/^from:\s.+/i.test(line) && /^(sent|date):\s/i.test(lines[i + 1] ?? '')) break;
    if (/^\s*>/.test(line)) continue;
    out.push(line);
  }
  const kept = out.join('\n').trim();
  return kept || text.trim();
}

function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function parseReply(source: Buffer): Promise<ParsedReply> {
  const parsed = await simpleParser(source);
  const from = parsed.from?.value?.[0];
  const subject = parsed.subject ?? '';
  const fromAddress = from?.address ?? '';
  const raw = parsed.text?.trim() ? parsed.text : typeof parsed.html === 'string' ? htmlToText(parsed.html) : '';
  return {
    candidateIds: extractCandidateMessageIds(parsed),
    fromAddress,
    fromName: from?.name || null,
    subject,
    body: stripQuotedReply(raw),
    autoReply: isAutoReply(parsed.headers, fromAddress, subject),
    messageId: parsed.messageId ?? null,
  };
}

export type PollDeps = {
  getCursor(): Promise<number | null>;
  setCursor(lastUid: number, firstRun: boolean): Promise<void>;
  /** The invoice a message id belongs to, or null when it is not one of our reminders. */
  findInvoiceId(candidateIds: string[]): Promise<string | null>;
  handleReply(r: ParsedReply & { invoiceId: string }): Promise<{ handled: boolean }>;
  /** The UIDVALIDITY last seen for this mailbox, or null if never recorded. Optional: without it the poll cannot notice a renumbered mailbox. */
  getUidValidity?(): Promise<number | null>;
  /** Store the UIDVALIDITY now in force. `reset` is set when the cursor was moved because it changed, with why. */
  recordUidValidity?(validity: number, reset: UidValidityReset | null): Promise<void>;
  /** True when a message with this Message-ID was already filed, so it is never imported twice. */
  isKnownMessageId?(messageId: string): Promise<boolean>;
};

export type UidValidityReset = {
  reason: string;
  oldValidity: number | null;
  newValidity: number;
  oldCursor: number | null;
  newCursor: number;
};

export type PollResult = { scanned: number; matched: number; errors: number; skipped?: string; uidValidityReset?: string };

/**
 * UIDs are only meaningful within one UIDVALIDITY. If the server reports a
 * different value (mailbox restored, migrated, recreated) the saved cursor
 * points at unrelated messages: either old mail would be read again or new
 * mail skipped. Returns why the cursor must be reset, or null when it is safe.
 */
export function uidValidityProblem(o: { stored: number | null; current: number | null; lastUid: number; uidNext: number }): string | null {
  if (o.current !== null && o.stored !== null && o.stored !== o.current) {
    return `UIDVALIDITY changed from ${o.stored} to ${o.current}; saved UIDs no longer refer to the same messages`;
  }
  if (o.lastUid >= o.uidNext) {
    return `saved cursor ${o.lastUid} is ahead of the mailbox (next UID ${o.uidNext}); the mailbox was probably renumbered`;
  }
  return null;
}

/**
 * Read-only: opens the mailbox with EXAMINE and never sets a flag, so mail the
 * founder has not read stays unread. Progress is a UID cursor. The first run
 * only records where the mailbox is now and processes nothing.
 */
export async function pollMailbox(cfg: ImapConfig, deps: PollDeps): Promise<PollResult> {
  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    ...(cfg.plainOnly ? { doSTARTTLS: false } : {}),
    auth: { user: cfg.user, pass: cfg.pass },
    logger: false,
  });
  // Without a listener a dropped connection becomes an unhandled 'error' event and kills the process.
  client.on('error', () => {});

  let scanned = 0, matched = 0, errors = 0;
  await client.connect();
  try {
    const box = await client.mailboxOpen(cfg.mailbox, { readOnly: true });
    const uidNext = box.uidNext;
    const lastUid = await deps.getCursor();
    const current = Number.isFinite(Number(box.uidValidity)) && Number(box.uidValidity) > 0 ? Number(box.uidValidity) : null;
    const stored = deps.getUidValidity ? await deps.getUidValidity() : null;
    if (lastUid === null) {
      await deps.setCursor(Math.max(0, uidNext - 1), true);
      if (current !== null) await deps.recordUidValidity?.(current, null);
      return { scanned, matched, errors };
    }
    const problem = uidValidityProblem({ stored, current, lastUid, uidNext });
    if (problem) {
      // Do not re-read the mailbox from UID 1: that would classify old mail as new.
      // Start from the end, like a first run, and say why. Mail that arrived since
      // the last poll but before this one is not read; the recorded reason tells the owner.
      const newCursor = Math.max(0, uidNext - 1);
      await deps.setCursor(newCursor, false);
      if (current !== null) await deps.recordUidValidity?.(current, { reason: problem, oldValidity: stored, newValidity: current, oldCursor: lastUid, newCursor });
      console.warn(`[inbox-poll] ${problem}; cursor reset to ${newCursor}`);
      return { scanned, matched, errors, uidValidityReset: problem };
    }
    // First poll after this feature shipped: remember the value so a later change is caught.
    if (stored === null && current !== null) await deps.recordUidValidity?.(current, null);
    const fromUid = lastUid + 1;
    if (fromUid >= uidNext) return { scanned, matched, errors };

    let highest = lastUid;
    // Collect first: calling other IMAP commands while iterating a fetch can deadlock, and we do not.
    const batch: { uid: number; source?: Buffer }[] = [];
    for await (const msg of client.fetch(`${fromUid}:*`, { uid: true, source: true }, { uid: true })) {
      batch.push({ uid: msg.uid, source: msg.source });
    }
    for (const msg of batch) {
      // "n:*" always returns the newest message even when n is past the end.
      if (msg.uid < fromUid) continue;
      scanned += 1;
      let reply: ParsedReply | null = null;
      try {
        if (msg.source) reply = await parseReply(msg.source);
      } catch (e) {
        // A message we cannot parse will never parse: count it and move past it.
        errors += 1;
        console.error(`[inbox-poll] unparseable uid ${msg.uid}:`, e instanceof Error ? e.message : e);
      }
      try {
        if (reply && reply.messageId && deps.isKnownMessageId && (await deps.isKnownMessageId(reply.messageId))) {
          reply = null; // already filed (a renumbered mailbox can show the same mail under a new UID)
        }
        if (reply && reply.candidateIds.length > 0) {
          const invoiceId = await deps.findInvoiceId(reply.candidateIds);
          if (invoiceId) {
            const res = await deps.handleReply({ ...reply, invoiceId });
            if (res.handled) matched += 1;
          }
        }
        highest = Math.max(highest, msg.uid);
      } catch (e) {
        // Most likely a database blip: stop here so this message is retried next run instead of lost.
        errors += 1;
        console.error(`[inbox-poll] failed to store uid ${msg.uid}:`, e instanceof Error ? e.message : e);
        break;
      }
    }
    await deps.setCursor(highest, false);
  } finally {
    try { await client.logout(); } catch { client.close(); }
  }
  return { scanned, matched, errors };
}
