/**
 * Dunning scheduler — runs the dunning sequence rules and creates scheduled runs.
 * Called by the cron endpoint at /api/cron/dunning
 */
import { db } from '@/db';
import { dunningSequences, dunningRuns, invoices, customers, organizations } from '@/db/schema';
import { eq, and, sql, lte, isNull, gt } from 'drizzle-orm';
import { generateDunningMessage } from '@/lib/ai/dunning';
import { sendEmail, sendSms } from '@/lib/infra';
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

export async function processDunning() {
  const now = new Date();
  const sequences = await db.select().from(dunningSequences).where(eq(dunningSequences.isActive, true));
  let scheduled = 0, sent = 0, errors = 0;

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

    for (const { invoice, customer } of overdueInvoices) {
      const days = Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / 86400000);
      const dueSteps = (seq.steps ?? []).filter((s: any) => s.daysFromDue <= days);
      if (!dueSteps.length) continue;

      const lastStep = dueSteps[dueSteps.length - 1];

      // Check if this exact step was already executed for this invoice
      const existing = await db
        .select()
        .from(dunningRuns)
        .where(and(
          eq(dunningRuns.invoiceId, invoice.id),
          eq(dunningRuns.sequenceId, seq.id),
          eq(dunningRuns.stepId, lastStep.id),
        ))
        .limit(1);
      if (existing[0]) continue;

      try {
        const result = await generateDunningMessage({
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
        });

        const [run] = await db.insert(dunningRuns).values({
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
        }).returning();

        // Send immediately (in production: queue with retries)
        try {
          if (lastStep.channel === 'email' && customer.email) {
            const sendResult = await sendEmail({
              to: customer.email,
              subject: result.subject ?? `Invoice ${invoice.number} is overdue`,
              html: renderEmailHtml({ body: result.body, invoice, businessName }),
            });
            // sendEmail throws on real failures (Resend 403, etc.) and returns
            // status='skipped' only when the API key is missing (a config bug).
            if ((sendResult as any).status === 'skipped') {
              await db.update(dunningRuns).set({ status: 'failed', error: 'resend api key missing' }).where(eq(dunningRuns.id, run.id));
              errors += 1;
            } else {
              await db.update(dunningRuns).set({ status: 'sent', sentAt: now }).where(eq(dunningRuns.id, run.id));
              sent += 1;
            }
          } else if (lastStep.channel === 'sms' && customer.phone) {
            const sms = await sendSms({ to: customer.phone, body: result.body });
            await db.update(dunningRuns).set({ status: 'sent', sentAt: now }).where(eq(dunningRuns.id, run.id));
            sent += 1;
          } else {
            // No channel available for this customer — cancel, don't mark 'sent'
            await db.update(dunningRuns).set({ status: 'cancelled', error: 'no email/phone on file' }).where(eq(dunningRuns.id, run.id));
          }
        } catch (e: any) {
          // Real send failure (Resend 403, Twilio error_code, etc.)
          await db.update(dunningRuns).set({ status: 'failed', error: String(e?.message ?? e).substring(0, 500) }).where(eq(dunningRuns.id, run.id));
          errors += 1;
        }
        scheduled += 1;
      } catch (e) {
        errors += 1;
      }
    }
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
