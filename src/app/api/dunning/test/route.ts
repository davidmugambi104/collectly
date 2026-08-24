import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { invoices, customers, organizations, dunningRuns, dunningSequences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateDunningMessage } from '@/lib/ai/dunning';
import { sendEmail, sendSms, withUnsubscribeFooter, dunningListUnsubscribeHeaders } from '@/lib/infra';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';

const body = z.object({
  invoiceId: z.string(),
  channel: z.enum(['email', 'sms']).default('email'),
  tone: z.enum(['friendly', 'firm', 'final']).default('firm'),
  sendReal: z.boolean().default(false),
});

/**
 * Test dunning message generation. If sendReal=true, actually send via Resend/Twilio
 * AND record a dunning_runs row. If false (default), just return the generated
 * message — useful for QA and screenshots.
 */
export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const data = body.parse(await req.json());
  const [row] = await db
    .select({ invoice: invoices, customer: customers, org: organizations })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(organizations, eq(organizations.id, invoices.orgId))
    .where(and(eq(invoices.id, data.invoiceId), eq(invoices.orgId, orgId)))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const now = Date.now();
  const daysOverdue = Math.max(0, Math.floor((now - new Date(row.invoice.dueDate).getTime()) / 86400000));
  const balance = String(Number(row.invoice.amount) - Number(row.invoice.amountPaid));

  try {
    const result = await generateDunningMessage({
      invoiceId: row.invoice.id,
      businessName: row.org.name,
      contactName: row.customer.name,
      invoiceNumber: row.invoice.number,
      amount: balance,
      currency: row.invoice.currency,
      dueDate: row.invoice.dueDate.toISOString().slice(0, 10),
      daysOverdue,
      tone: data.tone,
      channel: data.channel,
      priorMessages: 0,
      customerPaymentHistory: {
        avgDaysToPay: row.customer.paymentBehavior?.avgDaysToPay ?? 30,
        paidRate: row.customer.paymentBehavior?.paidRate ?? 0.85,
      },
    });

    if (!data.sendReal) {
      // Dry run: just return the generated message
      return NextResponse.json({ ok: true, sent: false, dryRun: true, daysOverdue, balance, ...result });
    }

    // Real send path: actually call Resend/Twilio and record a dunning_run.
    // Look up the org's active sequence to satisfy the FK constraint.
    const [seqRow] = await db
      .select({ id: dunningSequences.id })
      .from(dunningSequences)
      .where(eq(dunningSequences.orgId, row.org.id))
      .limit(1);
    if (!seqRow) {
      return NextResponse.json({ ok: false, error: 'no dunning sequence configured for this org' }, { status: 400 });
    }

    const [run] = await db.insert(dunningRuns).values({
      id: nanoid(),
      orgId: row.org.id,
      invoiceId: row.invoice.id,
      sequenceId: seqRow.id,
      stepId: 'manual-test',
      channel: data.channel,
      status: 'scheduled',
      scheduledFor: new Date(),
      subject: result.subject,
      body: result.body,
    }).returning();

    try {
      if (data.channel === 'email') {
        if (!row.customer.email) {
          await db.update(dunningRuns).set({ status: 'cancelled', error: 'no email on file' }).where(eq(dunningRuns.id, run.id));
          return NextResponse.json({ ok: false, error: 'customer has no email', dryRun: false, ...result }, { status: 400 });
        }
        const sendResult = await sendEmail({
          to: row.customer.email,
          subject: result.subject ?? `Invoice ${row.invoice.number} is overdue`,
          html: withUnsubscribeFooter(`<p style="white-space: pre-wrap; font-family: -apple-system, sans-serif;">${result.body}</p>`, row.customer.email),
          headers: dunningListUnsubscribeHeaders(row.customer.email),
        });
        await db.update(dunningRuns).set({ status: 'sent', sentAt: new Date() }).where(eq(dunningRuns.id, run.id));
        return NextResponse.json({ ok: true, sent: true, dryRun: false, runId: run.id, ...result, sendResult });
      } else {
        if (!row.customer.phone) {
          await db.update(dunningRuns).set({ status: 'cancelled', error: 'no phone on file' }).where(eq(dunningRuns.id, run.id));
          return NextResponse.json({ ok: false, error: 'customer has no phone', dryRun: false, ...result }, { status: 400 });
        }
        const sms = await sendSms({ to: row.customer.phone, body: result.body });
        await db.update(dunningRuns).set({ status: 'sent', sentAt: new Date() }).where(eq(dunningRuns.id, run.id));
        return NextResponse.json({ ok: true, sent: true, dryRun: false, runId: run.id, ...result, smsSid: sms.sid });
      }
    } catch (sendErr: unknown) {
      // Real send failure — mark run failed, surface error to caller
      const message = sendErr instanceof Error ? sendErr.message : String(sendErr);
      await db.update(dunningRuns).set({ status: 'failed', error: message.substring(0, 500) }).where(eq(dunningRuns.id, run.id));
      return NextResponse.json({ ok: false, error: message, runId: run.id, ...result }, { status: 502 });
    }
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
