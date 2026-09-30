/**
 * Dunning scheduler — runs the dunning sequence rules and creates scheduled runs.
 * Called by the cron endpoint at /api/cron/dunning
 */
import { db } from '@/db';
import { dunningSequences, dunningRuns, invoices, customers, organizations, users, promisesToPay, dunningHolds, dunningSettings, dunningApprovals, inboxMessages, customerGroupMembers, groupSequences, type Invoice } from '@/db/schema';
import { eq, and, sql, lte, inArray, gte } from 'drizzle-orm';
import { generateDunningMessage } from '@/lib/ai/dunning';
import { sendEmail, sendSms, withUnsubscribeFooter, dunningListUnsubscribeHeaders, getDunningReplyToAddress, fetchResendMessageId } from '@/lib/infra';
import { loadSendWindow, resolveFrom, loadChaseRules } from '@/lib/dunning/org-settings';
import { leadDays } from '@/lib/dunning/step-timing';
import { callTaskNote, callTaskTitle } from '@/lib/dunning/call-task';
import { loadListOthers, othersHtmlFor } from '@/lib/dunning/multi-invoice-load';
import { senderFromStep, senderKey } from '@/lib/dunning/step-sender';
import { belowMinBalance, isGapBlocked, CONTACTING_STATUSES, type ChaseRules, type RecentReminder } from '@/lib/dunning/chase-rules';
import { isWithinWindow } from '@/lib/dunning/send-window';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { isApprovalRequired } from '@/lib/dunning/approval';
import { recordEvent } from '@/lib/events';
import { maySendSms } from '@/lib/sms-consent';
import { ensureSmsConsentSchema } from '@/lib/sms-consent-schema';
import { nanoid, errorMessage, formatCurrency } from '@/lib/utils';

// Mirrors the inline element type of dunningSequences.steps's jsonb
// $type<Array<{...}>>() in schema.ts. That inline type has no exported name
// to import, and `seq.steps` does not infer cleanly through the `?? []`
// fallback below, so it is spelled out again here.
type DunningStep = {
  id: string;
  daysFromDue: number;
  channel: 'email' | 'sms' | 'phone';
  tone: 'friendly' | 'firm' | 'final';
  subject?: string;
  template: string;
  /** "Send as": see step-sender.ts. */
  senderName?: string;
  senderLocalPart?: string;
};

// Cache org names per process to avoid re-querying on every invoice
const orgNameCache = new Map<string, string>();
async function getOrgName(orgId: string): Promise<string> {
  const cached = orgNameCache.get(orgId);
  if (cached) return cached;
  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const name = org?.name ?? 'Your team';
  orgNameCache.set(orgId, name);
  return name;
}

const ownerEmailCache = new Map<string, string | null>();
async function getOwnerEmail(orgId: string): Promise<string | null> {
  if (ownerEmailCache.has(orgId)) return ownerEmailCache.get(orgId)!;
  const [row] = await db
    .select({ email: users.email })
    .from(organizations)
    .innerJoin(users, eq(users.id, organizations.ownerId))
    .where(eq(organizations.id, orgId))
    .limit(1);
  const email = row?.email ?? null;
  ownerEmailCache.set(orgId, email);
  return email;
}

type DigestEntry = { customerName: string; channel: 'email' | 'sms'; invoiceNumber: string; amount: string; currency: string };

// Sends the operator ("founder") a summary of what just went out on their
// behalf, since automatic sends otherwise happen with no human in the loop
// -- the recipient list is otherwise only visible by checking the dashboard.
// Best-effort: a notification failure must never fail the cron run itself.
async function notifyOwnerOfSends(orgId: string, entries: DigestEntry[]) {
  if (!entries.length) return;
  try {
    const [ownerEmail, businessName] = await Promise.all([getOwnerEmail(orgId), getOrgName(orgId)]);
    if (!ownerEmail) return;
    const rows = entries
      .map(
        (e) =>
          `<tr><td style="padding:6px 10px;border-bottom:1px solid #eeeef0;">${e.customerName}</td>` +
          `<td style="padding:6px 10px;border-bottom:1px solid #eeeef0;text-transform:capitalize;">${e.channel}</td>` +
          `<td style="padding:6px 10px;border-bottom:1px solid #eeeef0;">${e.invoiceNumber}</td>` +
          `<td style="padding:6px 10px;border-bottom:1px solid #eeeef0;">${e.currency} ${e.amount}</td></tr>`,
      )
      .join('');
    await sendEmail({
      to: ownerEmail,
      subject: `Mugavi sent ${entries.length} dunning reminder${entries.length === 1 ? '' : 's'} just now`,
      html: `
        <!doctype html>
        <html><body style="font-family: -apple-system, system-ui, sans-serif; color: #16171c; max-width: 600px; margin: 0 auto; padding: 24px;">
          <p style="font-size: 15px; line-height: 1.6;">Your automatic dunning sequence sent ${entries.length} reminder${entries.length === 1 ? '' : 's'} for ${businessName} just now:</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
            <thead><tr style="text-align:left;color:#6c6e76;text-transform:uppercase;font-size:11px;">
              <th style="padding:6px 10px;">Customer</th><th style="padding:6px 10px;">Channel</th><th style="padding:6px 10px;">Invoice</th><th style="padding:6px 10px;">Amount</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="font-size:12px;color:#6c6e76;margin-top:20px;">You can review or pause this at any time from the dunning dashboard.</p>
        </body></html>
      `,
    });
  } catch (e: unknown) {
    console.error('[dunning] owner notification failed:', errorMessage(e));
  }
}

// In approval mode nothing goes out on its own, so the owner has to hear that
// drafts are waiting, or reminders silently stop. Best-effort, like the digest
// above.
async function notifyOwnerOfPending(orgId: string, entries: DigestEntry[]) {
  if (!entries.length) return;
  try {
    const [ownerEmail, businessName] = await Promise.all([getOwnerEmail(orgId), getOrgName(orgId)]);
    if (!ownerEmail) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mugavi.com';
    const rows = entries
      .map((e) => `<li style="margin:4px 0;">${e.customerName}: invoice ${e.invoiceNumber}, ${e.currency} ${e.amount} (${e.channel})</li>`)
      .join('');
    await sendEmail({
      to: ownerEmail,
      subject: `${entries.length} reminder${entries.length === 1 ? '' : 's'} waiting for your approval`,
      html: `
        <!doctype html>
        <html><body style="font-family: -apple-system, system-ui, sans-serif; color: #16171c; max-width: 600px; margin: 0 auto; padding: 24px;">
          <p style="font-size: 15px; line-height: 1.6;">Mugavi drafted ${entries.length} reminder${entries.length === 1 ? '' : 's'} for ${businessName}. Nothing has been sent. Review, edit, approve or skip each one:</p>
          <ul style="font-size:13px;padding-left:18px;">${rows}</ul>
          <p style="margin-top:20px;"><a href="${appUrl}/dashboard/dunning#approvals" style="color:#2f4bd1;">Open the approval queue</a></p>
          <p style="font-size:12px;color:#6c6e76;margin-top:20px;">You can turn approval off in the dunning settings if you would rather reminders go out automatically.</p>
        </body></html>
      `,
    });
  } catch (e: unknown) {
    console.error('[dunning] owner pending notification failed:', errorMessage(e));
  }
}

export type ProcessOptions = {
  /** Only this organisation's schedules. Omit for the cron's all-orgs run. */
  orgId?: string;
  /**
   * Write drafts into the approval queue and stop. Nothing is sent, the send
   * window is ignored (there is nothing to time), and the owner gets no digest
   * email, whatever the org's approval setting says. Used by the first-run
   * button, which must be safe to press.
   */
  draftOnly?: boolean;
  /** Stop after this many drafts, so one click cannot fan out into hundreds of AI calls. */
  maxDrafts?: number;
};

export async function processDunning(opts: ProcessOptions = {}) {
  // Before any customers query: the model now includes sms_consent_status,
  // and Drizzle's select-all would throw undefined_column against a database
  // that has not had drizzle/0005 applied -- which would take down email
  // dunning too, not just SMS.
  await ensureSmsConsentSchema();
  // The overdue query below asks about holds, so the table must exist first.
  await ensureDunningControlSchema();
  const now = new Date();
  const sequences = await db.select().from(dunningSequences).where(opts.orgId ? and(eq(dunningSequences.isActive, true), eq(dunningSequences.orgId, opts.orgId)) : eq(dunningSequences.isActive, true));
  let scheduled = 0, sent = 0, errors = 0, awaitingApproval = 0, outsideWindow = 0;
  const orgDigest = new Map<string, DigestEntry[]>();
  const pendingDigest = new Map<string, DigestEntry[]>();
  // Read once per org per run, not cached across runs: the owner can flip it
  // between crons and the next run has to see that.
  const approvalByOrg = new Map<string, boolean>();
  async function approvalRequiredFor(orgId: string): Promise<boolean> {
    if (opts.draftOnly) return true;
    const known = approvalByOrg.get(orgId);
    if (known !== undefined) return known;
    const [row] = await db.select({ approvalRequired: dunningSettings.approvalRequired }).from(dunningSettings).where(eq(dunningSettings.orgId, orgId)).limit(1);
    const required = isApprovalRequired(row);
    approvalByOrg.set(orgId, required);
    return required;
  }

  const fromCache = new Map<string, string>();
  // One lookup per org and sender, not one per invoice. A step that sends "as" someone else gets its own line.
  const fromFor = async (orgId: string, businessName: string, step: DunningStep): Promise<string> => {
    const sender = senderFromStep(step);
    const key = `${orgId}|${senderKey(sender)}`;
    let v = fromCache.get(key);
    if (v === undefined) { v = await resolveFrom(orgId, businessName, sender); fromCache.set(key, v); }
    return v;
  };
  const listOthersByOrg = new Map<string, boolean>();
  const listOthersFor = async (orgId: string): Promise<boolean> => {
    let v = listOthersByOrg.get(orgId);
    if (v === undefined) { v = await loadListOthers(orgId); listOthersByOrg.set(orgId, v); }
    return v;
  };
  const windowOpenByOrg = new Map<string, boolean>();

  // Chasing rules, read once per org per run, and the reminders each customer
  // has had lately. The second is added to as drafts are made, so two invoices
  // of one customer in the same run cannot both get one.
  const rulesByOrg = new Map<string, ChaseRules>();
  async function rulesFor(orgId: string): Promise<ChaseRules> {
    const known = rulesByOrg.get(orgId);
    if (known) return known;
    const rules = await loadChaseRules(orgId);
    rulesByOrg.set(orgId, rules);
    return rules;
  }
  const recentByOrg = new Map<string, Map<string, RecentReminder[]>>();
  async function recentFor(orgId: string, gapDays: number): Promise<Map<string, RecentReminder[]>> {
    const known = recentByOrg.get(orgId);
    if (known) return known;
    const byCustomer = new Map<string, RecentReminder[]>();
    if (gapDays > 0) {
      const since = new Date(now.getTime() - gapDays * 86_400_000);
      const rows = await db
        .select({ customerId: invoices.customerId, invoiceId: dunningRuns.invoiceId, at: dunningRuns.createdAt })
        .from(dunningRuns)
        .innerJoin(invoices, eq(invoices.id, dunningRuns.invoiceId))
        .where(and(eq(dunningRuns.orgId, orgId), gte(dunningRuns.createdAt, since), inArray(dunningRuns.status, [...CONTACTING_STATUSES])));
      for (const r of rows as Array<{ customerId: string; invoiceId: string; at: Date }>) {
        const list = byCustomer.get(r.customerId) ?? [];
        list.push({ invoiceId: r.invoiceId, at: r.at });
        byCustomer.set(r.customerId, list);
      }
    }
    recentByOrg.set(orgId, byCustomer);
    return byCustomer;
  }

  for (const seq of sequences) {
    // Send window: only act during the owner's business hours. Nothing is
    // recorded for a skipped org, so the next run that lands inside the window
    // picks the same invoices up. Read once per org per run.
    let open = opts.draftOnly ? true : windowOpenByOrg.get(seq.orgId);
    if (open === undefined) {
      open = isWithinWindow(now, await loadSendWindow(seq.orgId));
      windowOpenByOrg.set(seq.orgId, open);
    }
    if (!open) { outsideWindow += 1; continue; }

    const businessName = await getOrgName(seq.orgId);

    // Which customers this schedule applies to. A group's own schedule covers
    // that group's members. The organisation's default schedule covers everyone
    // who is not in a group that has an active schedule of its own, so a
    // customer is never chased by two schedules at once.
    const [groupLink] = await db.select({ groupId: groupSequences.groupId }).from(groupSequences).where(eq(groupSequences.sequenceId, seq.id)).limit(1);
    const appliesTo = groupLink
      ? sql`EXISTS (
          SELECT 1 FROM ${customerGroupMembers}
          WHERE ${customerGroupMembers.customerId} = ${customers.id}
            AND ${customerGroupMembers.groupId} = ${groupLink.groupId}
        )`
      : sql`NOT EXISTS (
          SELECT 1 FROM ${customerGroupMembers}
          INNER JOIN ${groupSequences} ON ${groupSequences.groupId} = ${customerGroupMembers.groupId}
          INNER JOIN ${dunningSequences} ON ${dunningSequences.id} = ${groupSequences.sequenceId}
          WHERE ${customerGroupMembers.customerId} = ${customers.id}
            AND ${dunningSequences.isActive} = true
        )`;

    const overdueInvoices = await db
      .select({
        invoice: invoices,
        customer: customers,
      })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(and(
        eq(invoices.orgId, seq.orgId),
        appliesTo,
        sql`${invoices.status} IN ('sent', 'viewed', 'overdue', 'partial')`,
        // Not just overdue invoices: a step set before the due date ("a heads-up a
        // week ahead") needs invoices that are not late yet. The horizon is only as
        // far ahead as this schedule's earliest step reaches, so a schedule with no
        // such step sees exactly the invoices it always did.
        lte(invoices.dueDate, new Date(now.getTime() + leadDays(seq.steps) * 86_400_000)),
        // A customer who just promised to pay by a future date shouldn't
        // keep getting dunned in the meantime — disputes exclude via
        // invoices.status flipping to 'disputed', but creating a promise
        // (POST /api/promises) never touched invoice.status, so this was
        // the one pause condition dunning didn't actually respect. Once
        // promisedDate passes with the invoice still unpaid, the promise
        // stops excluding it and normal dunning resumes.
        sql`NOT EXISTS (
          SELECT 1 FROM ${promisesToPay}
          WHERE ${promisesToPay.invoiceId} = ${invoices.id}
            AND ${promisesToPay.status} = 'active'
            AND ${promisesToPay.promisedDate} >= ${now}
        )`,
        // Pause on reply. A customer who has answered a reminder has said
        // something a person needs to read ("we paid Friday", "wrong PO",
        // "call me"), and another automated nudge over the top of it is the
        // exact failure owners complain about. The reply stays 'new' in the
        // inbox until someone marks it handled or dismissed, and reminders for
        // that invoice wait until then. Honours the sequence's pauseOnReply.
        seq.pauseOnReply
          ? sql`NOT EXISTS (
              SELECT 1 FROM ${inboxMessages}
              WHERE ${inboxMessages.invoiceId} = ${invoices.id}
                AND ${inboxMessages.status} = 'new'
            )`
          : sql`TRUE`,
        // An owner-set hold ("I've spoken to them, leave it with me") pauses
        // automatic reminders for that customer, until its end date or until
        // the owner resumes. Deliberately separate from customers.dndAt, the
        // compliance switch below, which the app never clears.
        sql`NOT EXISTS (
          SELECT 1 FROM ${dunningHolds}
          WHERE ${dunningHolds.customerId} = ${customers.id}
            AND (${dunningHolds.heldUntil} IS NULL OR ${dunningHolds.heldUntil} > ${now})
        )`,
      ));

    // Batch-fetch every dunning_runs row already recorded for this sequence
    // across all of this sequence's overdue invoices in one query, instead
    // of one SELECT per invoice inside the loop below (N+1). Keyed by
    // `${invoiceId}:${stepId}` so the per-invoice dedup check becomes an
    // in-memory Set lookup. Correctness is still guaranteed by the DB-level
    // unique index + onConflictDoNothing on the insert further down — this
    // is purely to avoid a wasted AI-generation call for steps that are
    // already scheduled/sent.
    //
    // 'failed' rows are deliberately excluded from the skip set (and kept
    // in retriableRunIds instead): the dedup key is (invoiceId, sequenceId,
    // stepId), and since it's enforced by a DB-unique index a step could
    // only ever be inserted once, ever, no matter how its send actually
    // went. A transient failure (Resend 429, a Twilio error) permanently
    // pinned that step as "already handled" — the scheduler moved on to
    // whatever later step's threshold came due next and the failed one was
    // never retried or backfilled, with no other retry path anywhere in
    // the app. Retrying is intentionally scoped to 'failed' only, not
    // 'cancelled' (no contact info on file) — retrying that would just
    // waste an AI-generation call for the same, still-true reason.
    const invoiceIds = overdueInvoices.map(({ invoice }: typeof overdueInvoices[number]) => invoice.id);
    const existingRunKeys = new Set<string>();
    const retriableRunIds = new Map<string, string>();
    if (invoiceIds.length > 0) {
      const existingRuns = await db
        .select({ invoiceId: dunningRuns.invoiceId, stepId: dunningRuns.stepId, id: dunningRuns.id, status: dunningRuns.status })
        .from(dunningRuns)
        .where(and(
          eq(dunningRuns.sequenceId, seq.id),
          inArray(dunningRuns.invoiceId, invoiceIds),
        ));
      for (const r of existingRuns) {
        const key = `${r.invoiceId}:${r.stepId}`;
        if (r.status === 'failed') {
          retriableRunIds.set(key, r.id);
        } else {
          existingRunKeys.add(key);
        }
      }
    }

    const rules = await rulesFor(seq.orgId);
    const recentByCustomer = await recentFor(seq.orgId, rules.minGapDays);

    for (const { invoice, customer } of overdueInvoices) {
      if (opts.maxDrafts !== undefined && scheduled >= opts.maxDrafts) break;
      // Respect customer's do-not-disturb preference (set via /api/unsubscribe
      // with includeDnd=1). Skips email + SMS for this customer entirely.
      if (customer.dndAt) {
        continue;
      }
      // Owner rule: not worth chasing below this balance.
      if (belowMinBalance(Number(invoice.amount) - Number(invoice.amountPaid ?? 0), rules.minBalance)) continue;
      const days = Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / 86400000);
      // Sorted by day, so the last one really is the latest step that is due, whatever order they were saved in.
      const dueSteps = (seq.steps ?? []).filter((s: DunningStep) => s.daysFromDue <= days).sort((a: DunningStep, b: DunningStep) => a.daysFromDue - b.daysFromDue);
      if (!dueSteps.length) continue;

      const lastStep = dueSteps[dueSteps.length - 1];

      // Check if this exact step was already executed for this invoice
      // (batched lookup computed once above, not a per-invoice query).
      if (existingRunKeys.has(`${invoice.id}:${lastStep.id}`)) continue;

      // A call step is a task for the owner, not a message: nothing is sent, so
      // it skips the per-customer gap rule (which limits what customers receive),
      // the AI, approval and every email or SMS path below.
      if (lastStep.channel === 'phone') {
        const made = await db.insert(dunningRuns).values({
          id: nanoid(), orgId: seq.orgId, invoiceId: invoice.id, sequenceId: seq.id, stepId: lastStep.id,
          channel: 'phone', status: 'scheduled', scheduledFor: now,
          subject: callTaskTitle(customer.name, invoice.number),
          body: callTaskNote({
            customerName: customer.name, invoiceNumber: invoice.number, daysOverdue: days,
            amount: formatCurrency(Number(invoice.amount) - Number(invoice.amountPaid ?? 0), invoice.currency),
            phone: customer.phone, notes: lastStep.template || null,
          }),
        }).onConflictDoNothing({ target: [dunningRuns.invoiceId, dunningRuns.sequenceId, dunningRuns.stepId] }).returning({ id: dunningRuns.id });
        if (made.length) {
          scheduled += 1;
          await recordEvent({ orgId: seq.orgId, type: 'dunning.task.created', payload: { runId: made[0].id, invoiceId: invoice.id, stepId: lastStep.id, days } });
        }
        continue;
      }

      // Owner rule: at most one new reminder per customer in N days. Checked
      // before the AI call so a held-back invoice costs nothing.
      if (isGapBlocked(recentByCustomer.get(customer.id) ?? [], invoice.id, rules.minGapDays, now)) continue;

      try {
        const result = await generateDunningMessage({
          invoiceId: invoice.id,
          businessName,
          contactName: customer.name,
          invoiceNumber: invoice.number,
          amount: invoice.amount,
          currency: invoice.currency,
          dueDate: invoice.dueDate.toISOString().slice(0, 10),
          daysOverdue: days,
          tone: lastStep.tone,
          channel: lastStep.channel,
          priorMessages: dueSteps.length - 1,
          customerPaymentHistory: {
            avgDaysToPay: customer.paymentBehavior?.avgDaysToPay ?? 30,
            paidRate: customer.paymentBehavior?.paidRate ?? 1,
          },
          // The step's editable text (still called `template` in stored
          // sequence JSON for backward compat) was previously collected in
          // the UI but never passed anywhere -- generateDunningMessage()
          // always ignored it and wrote a message from tone/channel alone.
          // Wired through as brandVoice (a field the AI context already
          // supports but nothing populated) so what a user configures here
          // actually shapes the real, scheduled message, not just a look.
          brandVoice: lastStep.template || undefined,
        });

        // Wrap the dedup select + insert in a single transaction so a
      // concurrent cron invocation cannot double-schedule the same
      // (invoiceId, sequenceId, stepId). We rely on the unique index on
      // (invoice_id, sequence_id, step_id) (added in 0003 if not present;
      // dedup is the existing convention).
      // P1.4 audit fix 2026-07-31.
      //
      // A retry (retriableRunIds has this key -- see the batched fetch
      // above) uses ON CONFLICT DO UPDATE instead of DO NOTHING, so a
      // previously-failed row gets a fresh scheduledFor/subject/body and
      // its status reset to 'scheduled' rather than being silently
      // skipped by the same unique index that's supposed to prevent
      // double-sends, not prevent ever retrying a real failure.
      const retryKey = `${invoice.id}:${lastStep.id}`;
      const isRetry = retriableRunIds.has(retryKey);
      const insertValues = {
        id: nanoid(),
        orgId: seq.orgId,
        invoiceId: invoice.id,
        sequenceId: seq.id,
        stepId: lastStep.id,
        channel: lastStep.channel,
        status: 'scheduled' as const,
        scheduledFor: now,
        subject: result.subject,
        body: result.body,
      };
      let insertedRunId: string | null = null;
      try {
        insertedRunId = await db.transaction(async (tx: typeof db) => {
          const query = tx.insert(dunningRuns).values(insertValues);
          const [run] = isRetry
            ? await query
                .onConflictDoUpdate({
                  target: [dunningRuns.invoiceId, dunningRuns.sequenceId, dunningRuns.stepId],
                  set: { status: 'scheduled', scheduledFor: now, subject: result.subject, body: result.body, error: null, sentAt: null, externalMessageId: null },
                })
                .returning()
            : await query
                .onConflictDoNothing({ target: [dunningRuns.invoiceId, dunningRuns.sequenceId, dunningRuns.stepId] })
                .returning();
          return run?.id ?? null;
        });
      } catch (e: unknown) {
        errors += 1;
        console.error('[dunning] schedule tx failed:', errorMessage(e));
        continue;
      }
      if (!insertedRunId) continue; // another concurrent run won the race
      const recentList = recentByCustomer.get(customer.id) ?? [];
      recentList.push({ invoiceId: invoice.id, at: now });
      recentByCustomer.set(customer.id, recentList);

      const run = { id: insertedRunId } as { id: string };

        // Approval mode (the default): the draft is saved and queued for the
        // owner instead of being sent. Approving from the dashboard sends it
        // through src/lib/dunning/deliver.ts, which re-checks everything.
        if (await approvalRequiredFor(seq.orgId)) {
          await db.insert(dunningApprovals).values({ runId: run.id, orgId: seq.orgId }).onConflictDoNothing();
          awaitingApproval += 1;
          scheduled += 1;
          await recordEvent({
            orgId: seq.orgId,
            type: 'dunning.run.awaiting_approval',
            payload: { runId: run.id, invoiceId: invoice.id, stepId: lastStep.id, days },
          });
          const pending = pendingDigest.get(seq.orgId) ?? [];
          pending.push({ customerName: customer.name, channel: lastStep.channel, invoiceNumber: invoice.number, amount: invoice.amount, currency: invoice.currency });
          pendingDigest.set(seq.orgId, pending);
          continue;
        }

        // Send immediately (in production: queue with retries)
        try {
          if (lastStep.channel === 'email' && customer.email) {
            const sendResult = await sendEmail({
              to: customer.email,
              subject: result.subject ?? `Invoice ${invoice.number} is overdue`,
              html: withUnsubscribeFooter(renderEmailHtml({
                body: result.body, invoice, businessName,
                // The customer's other overdue invoices, listed by us from the database (never the AI).
                extraHtml: await othersHtmlFor({
                  enabled: await listOthersFor(seq.orgId), orgId: seq.orgId, customerId: customer.id, invoiceId: invoice.id,
                  thisBalance: Number(invoice.amount) - Number(invoice.amountPaid ?? 0), currency: invoice.currency ?? 'USD', now,
                }),
              }), customer.email),
              headers: dunningListUnsubscribeHeaders(customer.email),
              // "Acme Studio via Mugavi", so the recipient sees who they owe
              // rather than an unexplained platform address.
              from: await fromFor(seq.orgId, businessName, lastStep),
              replyTo: getDunningReplyToAddress(),
            });
            // sendEmail throws on real failures (Resend 403, etc.) and returns
            // status='skipped' only when the API key is missing (a config bug).
            if (sendResult.status === 'skipped') {
              await db.update(dunningRuns).set({ status: 'failed', error: 'resend api key missing' }).where(eq(dunningRuns.id, run.id));
              errors += 1;
            } else {
              await db.update(dunningRuns).set({ status: 'sent', sentAt: now }).where(eq(dunningRuns.id, run.id));
              sent += 1;
              // Best-effort: capture the real Message-ID so a reply to this
              // email can be matched back to this run via In-Reply-To.
              // Awaited (not fire-and-forget) — a serverless function's
              // background work isn't guaranteed to run past the response,
              // and a missed id here means that reply can never be matched.
              // Failure here never fails the send that already succeeded.
              try {
                const msgId = sendResult.id ? await fetchResendMessageId(sendResult.id) : null;
                if (msgId) await db.update(dunningRuns).set({ externalMessageId: msgId }).where(eq(dunningRuns.id, run.id));
              } catch (e: unknown) {
                console.error('[dunning] fetchResendMessageId failed:', e instanceof Error ? e.message : e);
              }
              await recordEvent({
                orgId: seq.orgId,
                type: 'dunning.run.sent',
                payload: { runId: run.id, invoiceId: invoice.id, channel: 'email', customer: customer.email, days },
              });
              const digest = orgDigest.get(seq.orgId) ?? [];
              digest.push({ customerName: customer.name, channel: 'email', invoiceNumber: invoice.number, amount: invoice.amount, currency: invoice.currency });
              orgDigest.set(seq.orgId, digest);
            }
          } else if (lastStep.channel === 'sms' && customer.phone) {
            // Express consent is required before any marketing-adjacent SMS,
            // and Twilio's toll-free verification is granted on the strength of
            // this gate existing. A phone number arriving from Xero is not
            // permission to text it, so the default is 'none' and this refuses
            // anything that is not an explicit opted_in.
            //
            // Cancelled rather than failed: nothing broke, we simply do not
            // have permission, and a 'failed' run would show up in the error
            // count and invite someone to retry it.
            if (!maySendSms(customer)) {
              await db
                .update(dunningRuns)
                .set({ status: 'cancelled', error: `sms consent: ${customer.smsConsentStatus ?? 'none'}` })
                .where(eq(dunningRuns.id, run.id));
              continue;
            }
            const sms = await sendSms({ to: customer.phone, body: result.body });
            // sendSms returns { sid: 'dev-stub', status: 'skipped' as const }
            // when Twilio isn't configured, mirroring sendEmail's contract.
            // Without this check, every SMS dunning step gets recorded as
            // 'sent' in the dashboard while zero messages actually go out.
            // P0 audit fix 2026-07-31 — mirrors the email-branch guard three
            // lines above (lines 109–110).
            if (sms.status === 'skipped') {
              await db.update(dunningRuns).set({ status: 'failed', error: 'twilio not configured' }).where(eq(dunningRuns.id, run.id));
              errors += 1;
              await recordEvent({
                orgId: seq.orgId,
                type: 'dunning.run.failed',
                payload: { runId: run.id, invoiceId: invoice.id, channel: 'sms', error: 'twilio not configured' },
              });
            } else {
              await db.update(dunningRuns).set({ status: 'sent', sentAt: now, externalMessageId: sms.sid }).where(eq(dunningRuns.id, run.id));
              sent += 1;
              await recordEvent({
                orgId: seq.orgId,
                type: 'dunning.run.sent',
                payload: { runId: run.id, invoiceId: invoice.id, channel: 'sms', customer: customer.phone, days },
              });
              const digest = orgDigest.get(seq.orgId) ?? [];
              digest.push({ customerName: customer.name, channel: 'sms', invoiceNumber: invoice.number, amount: invoice.amount, currency: invoice.currency });
              orgDigest.set(seq.orgId, digest);
            }
          } else {
            // This step's configured channel has no matching contact info.
            // The customer may still have the OTHER channel on file — there
            // is no cross-channel fallback (a step configured for SMS never
            // falls back to email even if only email is on file, or vice
            // versa) — but the error previously said "no email/phone on
            // file" unconditionally, which is simply false whenever the
            // other channel *is* on file, and misleads anyone triaging
            // cancelled runs in the dashboard into thinking the customer
            // has no contact info at all.
            const reason = lastStep.channel === 'email'
              ? (customer.phone ? 'step is set to email, but only a phone number is on file' : 'no email on file')
              : (customer.email ? 'step is set to SMS, but only an email address is on file' : 'no phone number on file');
            await db.update(dunningRuns).set({ status: 'cancelled', error: reason }).where(eq(dunningRuns.id, run.id));
            await recordEvent({
              orgId: seq.orgId,
              type: 'dunning.run.cancelled',
              payload: { runId: run.id, invoiceId: invoice.id, reason },
            });
          }
        } catch (e: unknown) {
          // Real send failure (Resend 403, Twilio error_code, etc.)
          await db.update(dunningRuns).set({ status: 'failed', error: errorMessage(e).substring(0, 500) }).where(eq(dunningRuns.id, run.id));
          errors += 1;
          await recordEvent({
            orgId: seq.orgId,
            type: 'dunning.run.failed',
            payload: { runId: run.id, invoiceId: invoice.id, channel: lastStep.channel, error: errorMessage(e).substring(0, 500) },
          });
        }
        scheduled += 1;
        await recordEvent({
          orgId: seq.orgId,
          type: 'dunning.run.scheduled',
          payload: { runId: run.id, invoiceId: invoice.id, stepId: lastStep.id, days },
        });
      } catch {
        errors += 1;
      }
    }
  }

  if (!opts.draftOnly) {
    for (const [orgId, entries] of orgDigest) {
      await notifyOwnerOfSends(orgId, entries);
    }
    for (const [orgId, entries] of pendingDigest) {
      await notifyOwnerOfPending(orgId, entries);
    }
  }

  return { scheduled, sent, errors, awaitingApproval, outsideWindow };
}

/** `extraHtml` is already-escaped markup from multi-invoice.ts, placed under the message. */
export function renderEmailHtml({ body, invoice, businessName, extraHtml = '' }: { body: string; invoice: Invoice; businessName: string; extraHtml?: string }) {
  return `
    <!doctype html>
    <html><body style="font-family: -apple-system, system-ui, sans-serif; color: #16171c; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${body}</p>${extraHtml}
      <hr style="border: 0; border-top: 1px solid #eeeef0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #6c6e76;">${businessName} · Invoice #${invoice.number} for ${invoice.currency} ${invoice.amount}</p>
    </body></html>
  `;
}
