import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db, schema } from '@/db/client';
import { dunningSequences, dunningRuns, invoices, customers } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { sendEmail, sendSms } from '@/lib/infra';
import { nanoid } from '@/lib/utils';
import { z } from 'zod';

const bodySchema = z.object({
  invoiceId: z.string(),
  channel: z.enum(['email', 'sms']),
  tone: z.enum(['friendly', 'firm', 'final']),
  subject: z.string().optional(),
  body: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const data = bodySchema.parse(await req.json());

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, data.invoiceId)).limit(1);
  if (!inv || inv.orgId !== orgId) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const [cust] = await db.select().from(customers).where(eq(customers.id, inv.customerId)).limit(1);
  if (!cust) return NextResponse.json({ error: 'customer missing' }, { status: 400 });

  // Get or create default sequence
  let [seq] = await db.select().from(dunningSequences).where(and(eq(dunningSequences.orgId, orgId), eq(dunningSequences.isActive, true))).limit(1);

  const [run] = await db.insert(dunningRuns).values({
    id: nanoid(), orgId, invoiceId: data.invoiceId,
    sequenceId: seq?.id ?? 'manual',
    stepId: 'manual', channel: data.channel, status: 'scheduled',
    scheduledFor: new Date(), subject: data.subject, body: data.body,
  }).returning();

  try {
    if (data.channel === 'email') {
      if (!cust.email) throw new Error('Customer has no email');
      await sendEmail({ to: cust.email, subject: data.subject ?? `Invoice ${inv.number}`, html: `<p style="white-space:pre-wrap;font-family:system-ui;">${data.body}</p>` });
    } else {
      if (!cust.phone) throw new Error('Customer has no phone');
      await sendSms({ to: cust.phone, body: data.body });
    }
    await db.update(dunningRuns).set({ status: 'sent', sentAt: new Date() }).where(eq(dunningRuns.id, run.id));
    await db.update(invoices).set({ lastReminderAt: new Date() }).where(eq(invoices.id, data.invoiceId));
    return NextResponse.json({ ok: true, id: run.id });
  } catch (e: any) {
    await db.update(dunningRuns).set({ status: 'failed', error: String(e?.message ?? e) }).where(eq(dunningRuns.id, run.id));
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
