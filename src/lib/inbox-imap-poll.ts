import { db } from '@/db';
import { dunningRuns, inboxPollState, reminderCopies } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { handleArCustomerReply } from '@/lib/inbox-inbound';
import { pollMailbox, resolveImapConfig, type PollResult } from '@/lib/inbox-imap-core';

/**
 * Poll the reply mailbox for replies to dunning emails. A message's
 * In-Reply-To/References headers are matched against
 * dunning_runs.external_message_id (captured at send time via
 * fetchResendMessageId in src/lib/infra.ts), or against a copy's own id in
 * reminder_copies. Standard thread headers, independent of the address used.
 *
 * The IMAP and parsing logic lives in src/lib/inbox-imap-core.ts (tested
 * against a stand-in server); this file only connects it to the tables.
 *
 * Dormant until AR_DUNNING_IMAP_USER and AR_DUNNING_IMAP_APP_PASSWORD are
 * set. It is a different mailbox from the cold-outreach poller
 * (src/lib/outreach-imap-poll.ts, ZOHO_IMAP_*) on purpose.
 *
 * Progress is a UID cursor in inbox_poll_state, never \Seen flags, so reading
 * the mailbox by hand is undisturbed. The first run records the current end
 * of the mailbox and processes nothing, so old mail is never bulk classified.
 */
export async function pollInboxReplies(): Promise<PollResult> {
  const cfg = resolveImapConfig(process.env);
  if (!cfg) {
    return { scanned: 0, matched: 0, errors: 0, skipped: 'AR_DUNNING_IMAP_USER/AR_DUNNING_IMAP_APP_PASSWORD not configured' };
  }
  // Namespaced apart from the outreach poller's cursor.
  const cursorKey = `ar-dunning:${cfg.user}`;

  return pollMailbox(cfg, {
    async getCursor() {
      const [row] = await db.select().from(inboxPollState).where(eq(inboxPollState.mailbox, cursorKey)).limit(1);
      return row ? row.lastUid : null;
    },
    async setCursor(lastUid: number, firstRun: boolean) {
      if (firstRun) await db.insert(inboxPollState).values({ mailbox: cursorKey, lastUid });
      else await db.update(inboxPollState).set({ lastUid, updatedAt: new Date() }).where(eq(inboxPollState.mailbox, cursorKey));
    },
    async findInvoiceId(candidateIds: string[]) {
      const [run] = await db.select().from(dunningRuns).where(inArray(dunningRuns.externalMessageId, candidateIds)).limit(1);
      if (run) return run.invoiceId as string;
      // Someone copied on the reminder replies to their own copy's message id.
      try {
        const [copy] = await db.select({ runId: reminderCopies.runId }).from(reminderCopies).where(inArray(reminderCopies.externalMessageId, candidateIds)).limit(1);
        if (copy) {
          const [r] = await db.select().from(dunningRuns).where(eq(dunningRuns.id, copy.runId)).limit(1);
          if (r) return r.invoiceId as string;
        }
      } catch { /* the copies table may not exist yet: no copies were ever sent */ }
      return null;
    },
    handleReply: (r) => handleArCustomerReply({
      invoiceId: r.invoiceId,
      fromAddress: r.fromAddress,
      fromName: r.fromName,
      subject: r.subject,
      body: r.body,
      autoReply: r.autoReply,
      rawPayload: { messageId: r.messageId, candidateIds: r.candidateIds },
    }),
  });
}
