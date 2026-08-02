/**
 * Dunning scheduler — runs the dunning sequence rules and creates scheduled runs.
 * Called by the cron endpoint at /api/cron/dunning
 */
import { db } from '@/db';
import { dunningSequences, dunningRuns, invoices, customers, organizations, users } from '@/db/schema';
import { eq, and, sql, lte, isNull, gt, inArray } from 'drizzle-orm';
import { generateDunningMessage } from '@/lib/ai/dunning';
import { sendEmail, sendSms, withUnsubscribeFooter, dunningListUnsubscribeHeaders, buildInboxReplyToAddress } from '@/lib/infra';
import { recordEvent } from '@/lib/events';
import { nanoid } from '@/lib/utils';

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
      subject: `Collectly sent ${entries.length} dunning reminder${entries.length === 1 ? '' : 's'} just now`,
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
  } catch (e: any) {
    console.error('[dunning] owner notification failed:', e?.message);
  }
}

export async function processDunning() {
  const now = new Date();
  const sequences = await db.select().from(dunningSequences).where(eq(dunningSequences.isActive, true));
  let scheduled = 0, sent = 0, errors = 0;
  const orgDigest = new Map<string, DigestEntry[]>();

  for (const seq of sequences) {
    const businessName = await getOrgName(seq.orgId);

    const overdueInvoices = await db
      .select({
        invoice: invoices,
        customer: customers,
      })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(and(
        eq(invoices.orgId, seq.orgId),
        sql`${invoices.status} IN ('sent', 'viewed', 'overdue', 'partial')`,
        lte(invoices.dueDate, now),
      ));

    // Batch-fetch every dunning_runs row already recorded for this sequence
    // across all of this sequence's overdue invoices in one query, instead
    // of one SELECT per invoice inside the loop below (N+1). Keyed by
    // `${invoiceId}:${stepId}` so the per-invoice dedup check becomes an
    // in-memory Set lookup. Correctness is still guaranteed by the DB-level
    // unique index + onConflictDoNothing on the insert further down — this
    // is purely to avoid a wasted AI-generation call for steps that are
    // already scheduled/sent.
    const invoiceIds = overdueInvoices.map(({ invoice }: typeof overdueInvoices[number]) => invoice.id);
    const existingRunKeys = new Set<string>();
    if (invoiceIds.length > 0) {
      const existingRuns = await db
        .select({ invoiceId: dunningRuns.invoiceId, stepId: dunningRuns.stepId })
        .from(dunningRuns)
        .where(and(
          eq(dunningRuns.sequenceId, seq.id),
          inArray(dunningRuns.invoiceId, invoiceIds),
        ));
      for (const r of existingRuns) existingRunKeys.add(`${r.invoiceId}:${r.stepId}`);
    }

    for (const { invoice, customer } of overdueInvoices) {
      // Respect customer's do-not-disturb preference (set via /api/unsubscribe
      // with includeDnd=1). Skips email + SMS for this customer entirely.
      if (customer.dndAt) {
        continue;
      }
      const days = Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / 86400000);
      const dueSteps = (seq.steps ?? []).filter((s: any) => s.daysFromDue <= days);
      if (!dueSteps.length) continue;

      const lastStep = dueSteps[dueSteps.length - 1];

      // Check if this exact step was already executed for this invoice
      // (batched lookup computed once above, not a per-invoice query).
      if (existingRunKeys.has(`${invoice.id}:${lastStep.id}`)) continue;

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
      // dedup is the existing convention) and ON CONFLICT DO NOTHING so
      // the second writer sees zero returning rows and skips cleanly.
      // P1.4 audit fix 2026-07-31.
      let insertedRunId: string | null = null;
      try {
        insertedRunId = await db.transaction(async (tx: any) => {
          const [run] = await tx
            .insert(dunningRuns)
            .values({
              id: nanoid(),
              orgId: seq.orgId,
              invoiceId: invoice.id,
              sequenceId: seq.id,
              stepId: lastStep.id,
              channel: lastStep.channel,
              status: 'scheduled',
              scheduledFor: now,
              subject: result.subject,
              body: result.body,
            })
            .onConflictDoNothing({ target: [dunningRuns.invoiceId, dunningRuns.sequenceId, dunningRuns.stepId] })
            .returning();
          return run?.id ?? null;
        });
      } catch (e: any) {
        errors += 1;
        console.error('[dunning] schedule tx failed:', e?.message);
        continue;
      }
      if (!insertedRunId) continue; // another concurrent run won the race

      const run = { id: insertedRunId } as { id: string };

        // Send immediately (in production: queue with retries)
        try {
          if (lastStep.channel === 'email' && customer.email) {
            const sendResult = await sendEmail({
              to: customer.email,
              subject: result.subject ?? `Invoice ${invoice.number} is overdue`,
              html: withUnsubscribeFooter(renderEmailHtml({ body: result.body, invoice, businessName }), customer.email),
              headers: dunningListUnsubscribeHeaders(customer.email),
              replyTo: buildInboxReplyToAddress(invoice.id),
            });
            // sendEmail throws on real failures (Resend 403, etc.) and returns
            // status='skipped' only when the API key is missing (a config bug).
            if ((sendResult as any).status === 'skipped') {
              await db.update(dunningRuns).set({ status: 'failed', error: 'resend api key missing' }).where(eq(dunningRuns.id, run.id));
              errors += 1;
            } else {
              await db.update(dunningRuns).set({ status: 'sent', sentAt: now }).where(eq(dunningRuns.id, run.id));
              sent += 1;
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
            const sms = await sendSms({ to: customer.phone, body: result.body });
            // sendSms returns { sid: 'dev-stub', status: 'skipped' as const }
            // when Twilio isn't configured, mirroring sendEmail's contract.
            // Without this check, every SMS dunning step gets recorded as
            // 'sent' in the dashboard while zero messages actually go out.
            // P0 audit fix 2026-07-31 — mirrors the email-branch guard three
            // lines above (lines 109–110).
            if ((sms as any).status === 'skipped') {
              await db.update(dunningRuns).set({ status: 'failed', error: 'twilio not configured' }).where(eq(dunningRuns.id, run.id));
              errors += 1;
              await recordEvent({
                orgId: seq.orgId,
                type: 'dunning.run.failed',
                payload: { runId: run.id, invoiceId: invoice.id, channel: 'sms', error: 'twilio not configured' },
              });
            } else {
              await db.update(dunningRuns).set({ status: 'sent', sentAt: now }).where(eq(dunningRuns.id, run.id));
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
            // No channel available for this customer — cancel, don't mark 'sent'
            await db.update(dunningRuns).set({ status: 'cancelled', error: 'no email/phone on file' }).where(eq(dunningRuns.id, run.id));
            await recordEvent({
              orgId: seq.orgId,
              type: 'dunning.run.cancelled',
              payload: { runId: run.id, invoiceId: invoice.id, reason: 'no email/phone on file' },
            });
          }
        } catch (e: any) {
          // Real send failure (Resend 403, Twilio error_code, etc.)
          await db.update(dunningRuns).set({ status: 'failed', error: String(e?.message ?? e).substring(0, 500) }).where(eq(dunningRuns.id, run.id));
          errors += 1;
          await recordEvent({
            orgId: seq.orgId,
            type: 'dunning.run.failed',
            payload: { runId: run.id, invoiceId: invoice.id, channel: lastStep.channel, error: String(e?.message ?? e).substring(0, 500) },
          });
        }
        scheduled += 1;
        await recordEvent({
          orgId: seq.orgId,
          type: 'dunning.run.scheduled',
          payload: { runId: run.id, invoiceId: invoice.id, stepId: lastStep.id, days },
        });
      } catch (e) {
        errors += 1;
      }
    }
  }

  for (const [orgId, entries] of orgDigest) {
    await notifyOwnerOfSends(orgId, entries);
  }

  return { scheduled, sent, errors };
}

function renderEmailHtml({ body, invoice, businessName }: { body: string; invoice: any; businessName: string }) {
  return `
    <!doctype html>
    <html><body style="font-family: -apple-system, system-ui, sans-serif; color: #16171c; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${body}</p>
      <hr style="border: 0; border-top: 1px solid #eeeef0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #6c6e76;">${businessName} · Invoice #${invoice.number} for ${invoice.currency} ${invoice.amount}</p>
    </body></html>
  `;
}
