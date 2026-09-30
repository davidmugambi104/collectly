/**
 * Approve or skip a drafted reminder that is waiting in the approval queue.
 *
 * The scheduler drafts a reminder and, in approval mode, parks it here instead
 * of sending. Nothing is sent until a person approves it.
 *
 * Two properties matter more than the rest:
 *
 *  1. It cannot send twice. Both approve and skip first claim the queue row with
 *     a single DELETE ... RETURNING. Whoever gets the row acts; a double click,
 *     a second tab, or the cron all get nothing back and do nothing.
 *  2. Approval never overrides consent. A draft can sit for days, so everything
 *     that could make sending wrong is re-checked at the moment of approval: the
 *     invoice may have been paid, the customer may have unsubscribed, SMS
 *     consent may be missing. A person approving a message is not the
 *     recipient's consent.
 */
import { db } from '@/db';
import { dunningApprovals, dunningRuns, dunningSequences, inboxMessages, invoices, customers, organizations } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { sendEmail, sendSms, withUnsubscribeFooter, dunningListUnsubscribeHeaders, getDunningReplyToAddress, fetchResendMessageId } from '@/lib/infra';
import { resolveFrom } from '@/lib/dunning/org-settings';
import { senderFromStep } from '@/lib/dunning/step-sender';
import { loadListOthers, othersHtmlFor } from '@/lib/dunning/multi-invoice-load';
import { maySendSms } from '@/lib/sms-consent';
import { recordEvent } from '@/lib/events';
import { errorMessage } from '@/lib/utils';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { renderEmailHtml } from '@/lib/dunning/scheduler';
import { approvalBlocker, applyEdits, type ApprovalEdits } from '@/lib/dunning/approval';

export type DeliverResult =
  | { ok: true; status: 'sent' | 'skipped' }
  | { ok: false; status: number; error: string };

async function claim(orgId: string, runId: string): Promise<boolean> {
  const rows = await db
    .delete(dunningApprovals)
    .where(and(eq(dunningApprovals.runId, runId), eq(dunningApprovals.orgId, orgId)))
    .returning({ runId: dunningApprovals.runId });
  return rows.length > 0;
}

async function requeue(orgId: string, runId: string, error: string) {
  await db.insert(dunningApprovals).values({ runId, orgId }).onConflictDoNothing();
  await db.update(dunningRuns).set({ status: 'scheduled', error: error.slice(0, 500) }).where(eq(dunningRuns.id, runId));
}

export async function skipRun(opts: { orgId: string; runId: string; actorId?: string }): Promise<DeliverResult> {
  await ensureDunningControlSchema();
  if (!(await claim(opts.orgId, opts.runId))) {
    return { ok: false, status: 409, error: 'That reminder was already approved or skipped.' };
  }
  await db.update(dunningRuns).set({ status: 'cancelled', error: 'skipped by owner' }).where(and(eq(dunningRuns.id, opts.runId), eq(dunningRuns.orgId, opts.orgId)));
  await recordEvent({ orgId: opts.orgId, type: 'dunning.run.skipped', actorId: opts.actorId, payload: { runId: opts.runId } });
  return { ok: true, status: 'skipped' };
}

export async function approveRun(opts: { orgId: string; runId: string; actorId?: string; edits?: ApprovalEdits }): Promise<DeliverResult> {
  await ensureDunningControlSchema();
  const { orgId, runId } = opts;

  if (!(await claim(orgId, runId))) {
    return { ok: false, status: 409, error: 'That reminder was already approved or skipped.' };
  }

  const [row] = await db
    .select({ run: dunningRuns, invoice: invoices, customer: customers })
    .from(dunningRuns)
    .innerJoin(invoices, eq(invoices.id, dunningRuns.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(eq(dunningRuns.id, runId), eq(dunningRuns.orgId, orgId)))
    .limit(1);
  if (!row) return { ok: false, status: 404, error: 'Reminder not found.' };

  const { run, invoice, customer } = row;
  const channel = run.channel === 'sms' ? 'sms' : 'email';

  // A reply that nobody has handled yet blocks the send, unless this sequence
  // has reply-pause switched off. Same rule the scheduler applies.
  const [seq] = await db.select({ pauseOnReply: dunningSequences.pauseOnReply, steps: dunningSequences.steps }).from(dunningSequences).where(eq(dunningSequences.id, run.sequenceId)).limit(1);
  const [reply] = await db
    .select({ id: inboxMessages.id })
    .from(inboxMessages)
    .where(and(eq(inboxMessages.invoiceId, invoice.id), eq(inboxMessages.status, 'new')))
    .limit(1);

  const blocker = approvalBlocker({
    unhandledReply: (seq?.pauseOnReply ?? true) && !!reply,
    invoiceStatus: invoice.status,
    customerDndAt: customer.dndAt,
    channel,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    smsAllowed: maySendSms(customer),
  });
  if (blocker) {
    await db.update(dunningRuns).set({ status: 'cancelled', error: `not sent at approval: ${blocker}` }).where(eq(dunningRuns.id, runId));
    await recordEvent({ orgId, type: 'dunning.run.cancelled', actorId: opts.actorId, payload: { runId, invoiceId: invoice.id, reason: blocker } });
    return { ok: false, status: 409, error: `Not sent: ${blocker}.` };
  }

  const final = applyEdits({ subject: run.subject, body: run.body }, opts.edits);
  const now = new Date();

  try {
    if (channel === 'email') {
      const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
      const businessName = org?.name ?? 'Your team';
      const to = customer.email as string; // approvalBlocker guarantees it
      const sendResult = await sendEmail({
        to,
        subject: final.subject ?? `Invoice ${invoice.number} is overdue`,
        html: withUnsubscribeFooter(renderEmailHtml({
          body: final.body, invoice, businessName,
          // Worked out now, not at drafting time, so a balance paid in between is right.
          extraHtml: await othersHtmlFor({
            enabled: await loadListOthers(orgId), orgId, customerId: customer.id, invoiceId: invoice.id,
            thisBalance: Number(invoice.amount) - Number(invoice.amountPaid ?? 0), currency: invoice.currency ?? 'USD',
          }),
        }), to),
        headers: dunningListUnsubscribeHeaders(to),
        // A later step can be sent as a different name or address: see step-sender.ts.
        from: await resolveFrom(orgId, businessName, senderFromStep(seq?.steps?.find((st: { id: string }) => st.id === run.stepId))),
        replyTo: getDunningReplyToAddress(),
      });
      if (sendResult.status === 'skipped') throw new Error('email is not configured (no API key)');
      await db.update(dunningRuns).set({ status: 'sent', sentAt: now, subject: final.subject, body: final.body, error: null }).where(eq(dunningRuns.id, runId));
      try {
        const msgId = sendResult.id ? await fetchResendMessageId(sendResult.id) : null;
        if (msgId) await db.update(dunningRuns).set({ externalMessageId: msgId }).where(eq(dunningRuns.id, runId));
      } catch (e) {
        console.error('[dunning] fetchResendMessageId failed:', errorMessage(e));
      }
    } else {
      const sms = await sendSms({ to: customer.phone as string, body: final.body });
      if (sms.status === 'skipped') throw new Error('SMS is not configured');
      await db.update(dunningRuns).set({ status: 'sent', sentAt: now, body: final.body, externalMessageId: sms.sid, error: null }).where(eq(dunningRuns.id, runId));
    }
  } catch (e: unknown) {
    // Nothing was sent. Put it back in the queue so the owner can retry rather
    // than lose the draft.
    const message = errorMessage(e);
    await requeue(orgId, runId, message);
    await recordEvent({ orgId, type: 'dunning.run.failed', actorId: opts.actorId, payload: { runId, invoiceId: invoice.id, channel, error: message.slice(0, 500) } });
    return { ok: false, status: 502, error: `Could not send: ${message}. The draft is still in your queue.` };
  }

  await db.update(invoices).set({ lastReminderAt: now }).where(eq(invoices.id, invoice.id));
  await recordEvent({
    orgId,
    type: 'dunning.run.approved',
    actorId: opts.actorId,
    payload: { runId, invoiceId: invoice.id, channel, edited: final.body !== run.body || final.subject !== run.subject },
  });
  return { ok: true, status: 'sent' };
}
