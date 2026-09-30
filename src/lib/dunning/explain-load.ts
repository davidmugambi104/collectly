/** Gathers the facts explain() needs for one invoice. Every read is scoped to the org. */
import { db } from '@/db';
import { invoices, customers, dunningHolds, promisesToPay, inboxMessages, dunningSequences, dunningRuns, dunningSettings, customerGroupMembers, groupSequences } from '@/db/schema';
import { and, eq, gte, desc, sql, inArray, ne } from 'drizzle-orm';
import { maySendSms } from '@/lib/sms-consent';
import { isApprovalRequired } from '@/lib/dunning/approval';
import { loadSendWindow, isDefaultSequence, loadChaseRules } from '@/lib/dunning/org-settings';
import { gapBlockedUntil, CONTACTING_STATUSES } from '@/lib/dunning/chase-rules';
import { explain, type Explanation, type Step } from '@/lib/dunning/explain';

export async function explainInvoice(orgId: string, invoiceId: string, now = new Date()): Promise<Explanation | null> {
  const [row] = await db.select({ invoice: invoices, customer: customers }).from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId))).limit(1);
  if (!row) return null;
  const { invoice, customer } = row;

  const [hold] = await db.select({ heldUntil: dunningHolds.heldUntil }).from(dunningHolds).where(eq(dunningHolds.customerId, customer.id)).limit(1);
  const [promise] = await db.select({ d: promisesToPay.promisedDate }).from(promisesToPay)
    .where(and(eq(promisesToPay.invoiceId, invoice.id), eq(promisesToPay.status, 'active'), gte(promisesToPay.promisedDate, now)))
    .orderBy(desc(promisesToPay.promisedDate)).limit(1);
  const [reply] = await db.select({ id: inboxMessages.id }).from(inboxMessages).where(and(eq(inboxMessages.invoiceId, invoice.id), eq(inboxMessages.status, 'new'))).limit(1);

  // The schedule that applies: the customer's group's, if it has an active one, else the default.
  const [grouped] = await db.select({ seq: dunningSequences }).from(customerGroupMembers)
    .innerJoin(groupSequences, eq(groupSequences.groupId, customerGroupMembers.groupId))
    .innerJoin(dunningSequences, eq(dunningSequences.id, groupSequences.sequenceId))
    .where(and(eq(customerGroupMembers.customerId, customer.id), eq(dunningSequences.isActive, true))).limit(1);
  const [fallback] = grouped ? [] : await db.select().from(dunningSequences).where(and(eq(dunningSequences.orgId, orgId), isDefaultSequence, sql`${dunningSequences.name} <> 'Manual'`)).limit(1);
  const seq = grouped?.seq ?? fallback;

  const [settings] = await db.select({ approvalRequired: dunningSettings.approvalRequired }).from(dunningSettings).where(eq(dunningSettings.orgId, orgId)).limit(1);
  const runs = seq ? await db.select({ stepId: dunningRuns.stepId, status: dunningRuns.status }).from(dunningRuns).where(and(eq(dunningRuns.invoiceId, invoice.id), eq(dunningRuns.sequenceId, seq.id))) : [];

  // Chasing rules: what this customer has been sent about other invoices lately.
  const rules = await loadChaseRules(orgId);
  const recent = rules.minGapDays > 0
    ? await db.select({ invoiceId: dunningRuns.invoiceId, at: dunningRuns.createdAt }).from(dunningRuns)
        .innerJoin(invoices, eq(invoices.id, dunningRuns.invoiceId))
        .where(and(eq(dunningRuns.orgId, orgId), eq(invoices.customerId, customer.id), ne(dunningRuns.invoiceId, invoice.id),
          gte(dunningRuns.createdAt, new Date(now.getTime() - rules.minGapDays * 86_400_000)), inArray(dunningRuns.status, [...CONTACTING_STATUSES])))
    : [];

  const daysOverdue = Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / 86400000);
  return explain({
    now, invoiceStatus: invoice.status, daysOverdue, customerName: customer.name,
    customerUnsubscribed: !!customer.dndAt,
    hold: hold ? { heldUntil: hold.heldUntil } : null,
    promiseUntil: promise?.d ?? null,
    unhandledReply: !!reply, pauseOnReply: seq?.pauseOnReply ?? true,
    scheduleName: seq?.name ?? 'none', scheduleActive: !!seq?.isActive,
    steps: ((seq?.steps ?? []) as Step[]).map((s) => ({ id: s.id, daysFromDue: s.daysFromDue, channel: s.channel })),
    ranStepIds: runs.filter((r: { status: string }) => r.status !== 'failed').map((r: { stepId: string }) => r.stepId),
    failedStepIds: runs.filter((r: { status: string }) => r.status === 'failed').map((r: { stepId: string }) => r.stepId),
    approvalRequired: isApprovalRequired(settings),
    window: await loadSendWindow(orgId),
    hasEmail: !!customer.email, hasPhone: !!customer.phone, smsAllowed: maySendSms(customer),
    balance: Number(invoice.amount) - Number(invoice.amountPaid ?? 0), minBalance: rules.minBalance,
    gapDays: rules.minGapDays, gapBlockedUntil: gapBlockedUntil(recent as Array<{ invoiceId: string; at: Date }>, invoice.id, rules.minGapDays),
  });
}
