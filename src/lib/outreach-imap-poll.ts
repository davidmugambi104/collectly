import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { db } from '@/db';
import { inboxPollState } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { classifyAndPersistOutreachReply } from '@/lib/outreach-inbound';

const MAILBOX = process.env.ZOHO_IMAP_MAILBOX || 'INBOX';
// Namespaced separately from the AR-dunning poller's cursor (see
// src/lib/inbox-imap-poll.ts) so the two never clobber each other's
// progress if they ever end up pointed at the same physical Zoho address.
const CURSOR_KEY = `outreach:${process.env.ZOHO_IMAP_USER ?? MAILBOX}`;

/**
 * Poll the cold-outreach mailbox (whatever address outreach is actually
 * sent from — ZOHO_IMAP_USER, e.g. davie@getcollectly.app) for replies
 * from prospects. Resend's inbound-receiving webhook
 * (src/lib/outreach-inbound.ts) was built for this but Resend inbound
 * receiving is disabled on getcollectly.app (its MX points at Zoho), so
 * that webhook has never actually received anything live — this polls
 * the real mailbox instead and feeds the same classification/persist
 * logic.
 *
 * Only processes messages that carry an In-Reply-To or References header
 * (i.e. are actually part of a reply thread) — this is the founder's
 * real working mailbox, not an outreach-only inbox, so fresh/unthreaded
 * mail (newsletters, personal correspondence, notifications) is skipped
 * rather than fed through the outreach classifier as if it were a
 * prospect reply.
 *
 * Tracked by UID cursor (inbox_poll_state), not \Seen flags — same
 * reasoning as the AR-dunning poller: this is real mail the founder reads
 * normally, so polling must never mark things read as a side effect.
 * First run bootstraps the cursor to "now" so mailbox history is never
 * bulk-classified.
 */
export async function pollOutreachReplies(): Promise<{ scanned: number; matched: number; errors: number; skipped?: string }> {
  const user = process.env.ZOHO_IMAP_USER;
  const pass = process.env.ZOHO_IMAP_APP_PASSWORD;
  if (!user || !pass) {
    return { scanned: 0, matched: 0, errors: 0, skipped: 'ZOHO_IMAP_USER/ZOHO_IMAP_APP_PASSWORD not configured' };
  }

  const client = new ImapFlow({
    host: process.env.ZOHO_IMAP_HOST || 'imap.zoho.com',
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

        // Not a reply — skip. Prevents random inbound mail in the
        // founder's real inbox from being treated as a prospect reply.
        if (!parsed.inReplyTo && !parsed.references) continue;

        const fromEntry = parsed.from?.value?.[0];
        const fromAddress = (fromEntry?.address ?? '').toLowerCase().trim();
        if (!fromAddress) continue;

        await classifyAndPersistOutreachReply({
          fromAddress,
          subject: parsed.subject ?? '',
          text: parsed.text ?? (typeof parsed.html === 'string' ? parsed.html : ''),
          rawPayload: { messageId: parsed.messageId, inReplyTo: parsed.inReplyTo, references: parsed.references },
          source: 'zoho_imap',
        });
        matched += 1;
      } catch (e) {
        errors += 1;
        console.error(`[outreach-poll] failed to process uid ${msg.uid}:`, e instanceof Error ? e.message : e);
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
