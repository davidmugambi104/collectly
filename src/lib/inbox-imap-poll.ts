import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import { db } from '@/db';
import { dunningRuns, inboxPollState } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { handleArCustomerReply } from '@/lib/inbox-inbound';

const MAILBOX = process.env.AR_DUNNING_IMAP_MAILBOX || 'INBOX';
// Namespaced separately from the outreach poller's cursor (see
// src/lib/outreach-imap-poll.ts) so the two never clobber each other's
// progress if they ever end up pointed at the same physical Zoho address.
const CURSOR_KEY = `ar-dunning:${process.env.AR_DUNNING_IMAP_USER ?? MAILBOX}`;

function extractCandidateMessageIds(parsed: ParsedMail): string[] {
  const ids: string[] = [];
  if (parsed.inReplyTo) ids.push(parsed.inReplyTo);
  if (parsed.references) {
    if (Array.isArray(parsed.references)) ids.push(...parsed.references);
    else ids.push(parsed.references);
  }
  return ids.map((id) => id.trim()).filter(Boolean);
}

/**
 * Poll a Zoho mailbox for replies to dunning emails. Matches a message's
 * In-Reply-To/References headers against dunning_runs.external_message_id
 * (captured at send time via fetchResendMessageId in src/lib/infra.ts) —
 * standard email thread headers, independent of which address the
 * message was sent to.
 *
 * DORMANT by design: this is a distinct mailbox/credentials
 * (AR_DUNNING_IMAP_*) from the cold-outreach poller
 * (src/lib/outreach-imap-poll.ts, ZOHO_IMAP_*) on purpose — a customer
 * disputing an invoice and a sales prospect replying to a cold email are
 * unrelated reply streams and mixing them into one mailbox/classifier was
 * an earlier mistake here. Nothing sets AR_DUNNING_IMAP_USER yet (see
 * getDunningReplyToAddress in src/lib/infra.ts), so this cron effectively
 * no-ops until a dedicated address is configured.
 *
 * Tracked by UID cursor (inbox_poll_state), not \Seen flags — if this
 * ever polls a real inbox the founder also reads normally, marking
 * messages read as a side effect of polling would be actively harmful
 * (clearing the unread indicator on mail they haven't looked at yet).
 * Only a monotonically increasing "highest UID processed" is persisted,
 * and non-matching messages are left completely untouched.
 *
 * First run bootstraps the cursor to the mailbox's current uidNext and
 * processes nothing, so pre-existing mailbox history never gets bulk fed
 * through AI classification.
 */
export async function pollInboxReplies(): Promise<{ scanned: number; matched: number; errors: number; skipped?: string }> {
  const user = process.env.AR_DUNNING_IMAP_USER;
  const pass = process.env.AR_DUNNING_IMAP_APP_PASSWORD;
  if (!user || !pass) {
    return { scanned: 0, matched: 0, errors: 0, skipped: 'AR_DUNNING_IMAP_USER/AR_DUNNING_IMAP_APP_PASSWORD not configured' };
  }

  const client = new ImapFlow({
    host: process.env.AR_DUNNING_IMAP_HOST || 'imap.zoho.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  let scanned = 0, matched = 0, errors = 0;

  await client.connect();
  try {
    const box = await client.mailboxOpen(MAILBOX, { readOnly: true });
    const uidNext = box.uidNext;

    const [cursor] = await db.select().from(inboxPollState).where(eq(inboxPollState.mailbox, CURSOR_KEY)).limit(1);

    if (!cursor) {
      await db.insert(inboxPollState).values({ mailbox: CURSOR_KEY, lastUid: Math.max(0, uidNext - 1) });
      return { scanned: 0, matched: 0, errors: 0 };
    }

    const fromUid = cursor.lastUid + 1;
    if (fromUid >= uidNext) {
      return { scanned: 0, matched: 0, errors: 0 };
    }

    let highestSeen = cursor.lastUid;

    for await (const msg of client.fetch(`${fromUid}:*`, { source: true }, { uid: true })) {
      scanned += 1;
      highestSeen = Math.max(highestSeen, msg.uid);
      if (!msg.source) continue;

      try {
        const parsed = await simpleParser(msg.source);
        const candidateIds = extractCandidateMessageIds(parsed);
        if (candidateIds.length === 0) continue;

        const [run] = await db
          .select()
          .from(dunningRuns)
          .where(inArray(dunningRuns.externalMessageId, candidateIds))
          .limit(1);
        if (!run) continue;

        const fromEntry = parsed.from?.value?.[0];
        const result = await handleArCustomerReply({
          invoiceId: run.invoiceId,
          fromAddress: fromEntry?.address ?? '',
          fromName: fromEntry?.name ?? null,
          subject: parsed.subject ?? '',
          body: parsed.text ?? (typeof parsed.html === 'string' ? parsed.html : ''),
          rawPayload: { messageId: parsed.messageId, inReplyTo: parsed.inReplyTo, references: parsed.references },
        });
        if (result.handled) matched += 1;
      } catch (e) {
        errors += 1;
        console.error(`[inbox-poll] failed to process uid ${msg.uid}:`, e instanceof Error ? e.message : e);
      }
    }

    await db.update(inboxPollState).set({ lastUid: highestSeen, updatedAt: new Date() }).where(eq(inboxPollState.mailbox, CURSOR_KEY));
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }

  return { scanned, matched, errors };
}
