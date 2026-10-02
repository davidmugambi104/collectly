/**
 * Send a copy of a reminder or statement to a customer's extra recipients, each
 * as their own email with their own unsubscribe link. Runs after the main
 * email went out, and never fails it: a copy that cannot be sent is logged and
 * skipped. Someone who unsubscribed, or whose address is suppressed, is skipped.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { customerRecipients, emailSuppressions, reminderCopies } from '@/db/schema';
import { sendEmail, withUnsubscribeFooter, dunningListUnsubscribeHeaders, fetchResendMessageId } from '@/lib/infra';
import { pickCopyTargets } from '@/lib/recipients';
import { recordEvent } from '@/lib/events';
import { errorMessage } from '@/lib/utils';

export async function sendCopies(o: {
  orgId: string;
  customerId: string;
  primaryEmail: string | null;
  subject: string;
  /** The email body WITHOUT the unsubscribe footer; each copy gets its own. */
  baseHtml: string;
  from: string;
  replyTo?: string;
  /** For reminders: the run, so a reply from a copied person is matched back to it. */
  runId?: string;
}): Promise<{ sent: number; failed: number }> {
  const rows = await db.select({ email: customerRecipients.email, unsubscribedAt: customerRecipients.unsubscribedAt })
    .from(customerRecipients).where(and(eq(customerRecipients.customerId, o.customerId), eq(customerRecipients.orgId, o.orgId)));
  if (rows.length === 0) return { sent: 0, failed: 0 };

  const suppressed = new Set<string>();
  try {
    const hit = await db.select({ email: emailSuppressions.email }).from(emailSuppressions)
      .where(inArray(emailSuppressions.email, rows.map((r: { email: string }) => r.email.toLowerCase())));
    for (const h of hit) suppressed.add(h.email.toLowerCase());
  } catch {
    // The suppression table may not exist yet (it is created by the first opt-out): nobody is suppressed then.
  }

  const targets = pickCopyTargets(o.primaryEmail, rows, suppressed);
  let sent = 0, failed = 0;
  for (const to of targets) {
    try {
      const res = await sendEmail({
        to, subject: o.subject, html: withUnsubscribeFooter(o.baseHtml, to), headers: dunningListUnsubscribeHeaders(to), from: o.from, replyTo: o.replyTo,
      });
      if (res.status === 'skipped') { failed += 1; continue; }
      sent += 1;
      if (o.runId) {
        let msgId: string | null = null;
        try { msgId = res.id ? await fetchResendMessageId(res.id) : null; } catch (e) { console.error('[copies] fetchResendMessageId failed:', errorMessage(e)); }
        await db.insert(reminderCopies).values({ runId: o.runId, email: to, externalMessageId: msgId });
      }
    } catch (e: unknown) {
      failed += 1;
      console.error('[copies] could not send a copy:', errorMessage(e));
    }
  }
  if (sent + failed > 0) await recordEvent({ orgId: o.orgId, type: 'dunning.copies.sent', payload: { customerId: o.customerId, runId: o.runId ?? null, sent, failed } });
  return { sent, failed };
}
