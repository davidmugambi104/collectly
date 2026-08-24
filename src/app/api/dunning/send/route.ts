import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from "@/db";
import { dunningSequences, dunningRuns, invoices, customers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendEmail, sendSms, withUnsubscribeFooter, dunningListUnsubscribeHeaders, getDunningReplyToAddress, fetchResendMessageId } from '@/lib/infra';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

const bodySchema = z.object({
  invoiceId: z.string(),
  channel: z.enum(['email', 'sms']),
  tone: z.enum(['friendly', 'firm', 'final']),
  subject: z.string().optional(),
  body: z.string().min(1),
});

export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const data = bodySchema.parse(await req.json());

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, data.invoiceId)).limit(1);
  if (!inv || inv.orgId !== orgId) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const [cust] = await db.select().from(customers).where(eq(customers.id, inv.customerId)).limit(1);
  if (!cust) return NextResponse.json({ error: 'customer missing' }, { status: 400 });
  // Respect the customer's do-not-disturb preference (set via /api/unsubscribe).
  if (cust.dndAt) {
    return NextResponse.json({ error: 'customer has opted out of dunning emails' }, { status: 403 });
  }

  const [seq] = await db.select().from(dunningSequences).where(and(eq(dunningSequences.orgId, orgId), eq(dunningSequences.isActive, true))).limit(1);

  // FK requires a real dunning_sequences row. If the org has no active sequence
  // (e.g. they're sending a one-off manual dunning), ensure a "Manual" sequence
  // exists and use its id. Cheap upsert — only happens on first manual send.
  let sequenceId = seq?.id;
  if (!sequenceId) {
    // Check if ANY sequence exists for this org (not just active ones).
    const [anySeq] = await db
      .select({ id: dunningSequences.id })
      .from(dunningSequences)
      .where(eq(dunningSequences.orgId, orgId))
      .limit(1);
    if (anySeq) {
      sequenceId = anySeq.id;
    } else {
      // No sequence at all — create the manual fallback. In rare race conditions
      // a second sequence may be created; that's harmless (no unique constraint on orgId).
      const [created] = await db
        .insert(dunningSequences)
        .values({ id: nanoid(), orgId, name: 'Manual', isActive: false })
        .returning();
      sequenceId = created.id;
    }
  }

  const [run] = await db.insert(dunningRuns).values({
    id: nanoid(), orgId, invoiceId: data.invoiceId,
    sequenceId,
    stepId: 'manual', channel: data.channel, status: 'scheduled',
    scheduledFor: new Date(), subject: data.subject, body: data.body,
  }).returning();

  try {
    if (data.channel === 'email') {
      if (!cust.email) throw new Error('Customer has no email');
      const sendResult = await sendEmail({
        to: cust.email,
        subject: data.subject ?? `Invoice ${inv.number}`,
        html: withUnsubscribeFooter(`<p style="white-space:pre-wrap;font-family:system-ui;">${data.body}</p>`, cust.email),
        headers: dunningListUnsubscribeHeaders(cust.email),
        replyTo: getDunningReplyToAddress(),
      });
      try {
        const msgId = await fetchResendMessageId((sendResult as any).id);
        if (msgId) await db.update(dunningRuns).set({ externalMessageId: msgId }).where(eq(dunningRuns.id, run.id));
      } catch (e) {
        console.error('[dunning] fetchResendMessageId failed:', e instanceof Error ? e.message : e);
      }
      await db.update(dunningRuns).set({ status: 'sent', sentAt: new Date() }).where(eq(dunningRuns.id, run.id));
    } else {
      if (!cust.phone) throw new Error('Customer has no phone');
      const sms = await sendSms({ to: cust.phone, body: data.body });
      await db.update(dunningRuns).set({ status: 'sent', sentAt: new Date(), externalMessageId: sms.sid }).where(eq(dunningRuns.id, run.id));
    }
    await db.update(invoices).set({ lastReminderAt: new Date() }).where(eq(invoices.id, data.invoiceId));
    return NextResponse.json({ ok: true, id: run.id });
  } catch (e: any) {
    await db.update(dunningRuns).set({ status: 'failed', error: String(e?.message ?? e) }).where(eq(dunningRuns.id, run.id));
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
