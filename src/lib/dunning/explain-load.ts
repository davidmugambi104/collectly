/**
 * Gathers the facts explain() needs. One query per kind of fact for a whole set
 * of invoices, not one per invoice, so the invoice list can show a "next
 * reminder" for every row. Every read is scoped to the org.
 */
import { db } from '@/db';
import { invoices, customers, dunningHolds, promisesToPay, inboxMessages, dunningSequences, dunningRuns, dunningSettings, customerGroupMembers, groupSequences, customerCredits } from '@/db/schema';
import { and, eq, gte, sql, inArray } from 'drizzle-orm';
import { maySendSms } from '@/lib/sms-consent';
import { isApprovalRequired } from '@/lib/dunning/approval';
import { loadSendWindow, isDefaultSequence, loadChaseRules } from '@/lib/dunning/org-settings';
import { gapBlockedUntil, CONTACTING_STATUSES, type RecentReminder } from '@/lib/dunning/chase-rules';
import { explain, type Explanation, type Step } from '@/lib/dunning/explain';

type Seq = typeof dunningSequences.$inferSelect;

export async function explainInvoices(orgId: string, invoiceIds: string[], now = new Date()): Promise<Map<string, Explanation>> {
  const out = new Map<string, Explanation>();
  if (invoiceIds.length === 0) return out;

  const rows = await db.select({ invoice: invoices, customer: customers }).from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(inArray(invoices.id, invoiceIds), eq(invoices.orgId, orgId)));
  if (rows.length === 0) return out;
  const ids: string[] = rows.map((r: { invoice: { id: string } }) => r.invoice.id);
  const customerIds: string[] = [...new Set<string>(rows.map((r: { customer: { id: string } }) => r.customer.id))];

  const holdRows: Array<{ customerId: string; heldUntil: Date | null }> = await db.select({ customerId: dunningHolds.customerId, heldUntil: dunningHolds.heldUntil }).from(dunningHolds).where(inArray(dunningHolds.customerId, customerIds));
  const holdBy = new Map(holdRows.map((h) => [h.customerId, h]));

  // Unapplied credit per customer and currency, and what each owes in that currency, for the credit rule.
  const creditRows: Array<{ customerId: string; currency: string; amount: string }> = await db.select({ customerId: customerCredits.customerId, currency: customerCredits.currency, amount: customerCredits.amount })
    .from(customerCredits).where(inArray(customerCredits.customerId, customerIds));
  const creditBy = new Map(creditRows.map((c) => [`${c.customerId}:${c.currency}`, Number(c.amount)]));
  const owedBy = new Map<string, number>();
  if (creditRows.length > 0) {
    const owedRows: Array<{ customerId: string; currency: string; owed: string }> = await db
      .select({ customerId: invoices.customerId, currency: invoices.currency, owed: sql<string>`COALESCE(SUM(${invoices.amount} - ${invoices.amountPaid}), 0)` })
      .from(invoices)
      .where(and(inArray(invoices.customerId, customerIds), inArray(invoices.status, ['sent', 'viewed', 'overdue', 'partial'])))
      .groupBy(invoices.customerId, invoices.currency);
    for (const r of owedRows) owedBy.set(`${r.customerId}:${r.currency}`, Number(r.owed));
  }

  const promiseRows: Array<{ invoiceId: string; d: Date }> = await db.select({ invoiceId: promisesToPay.invoiceId, d: promisesToPay.promisedDate }).from(promisesToPay)
    .where(and(inArray(promisesToPay.invoiceId, ids), eq(promisesToPay.status, 'active'), gte(promisesToPay.promisedDate, now)));
  const promiseBy = new Map<string, Date>();
  for (const p of promiseRows) { const cur = promiseBy.get(p.invoiceId); if (!cur || p.d > cur) promiseBy.set(p.invoiceId, p.d); }

  const replyRows: Array<{ invoiceId: string | null }> = await db.select({ invoiceId: inboxMessages.invoiceId }).from(inboxMessages).where(and(inArray(inboxMessages.invoiceId, ids), eq(inboxMessages.status, 'new')));
  const hasReply = new Set(replyRows.map((r) => r.invoiceId));

  // The schedule that applies: the customer's group's, if it has an active one, else the default.
  const groupedRows: Array<{ customerId: string; seq: Seq }> = await db.select({ customerId: customerGroupMembers.customerId, seq: dunningSequences }).from(customerGroupMembers)
    .innerJoin(groupSequences, eq(groupSequences.groupId, customerGroupMembers.groupId))
    .innerJoin(dunningSequences, eq(dunningSequences.id, groupSequences.sequenceId))
    .where(and(inArray(customerGroupMembers.customerId, customerIds), eq(dunningSequences.isActive, true)));
  const groupedBy = new Map(groupedRows.map((g) => [g.customerId, g.seq]));
  const [fallback]: Seq[] = await db.select().from(dunningSequences).where(and(eq(dunningSequences.orgId, orgId), isDefaultSequence, sql`${dunningSequences.name} <> 'Manual'`)).limit(1);

  const [settings] = await db.select({ approvalRequired: dunningSettings.approvalRequired }).from(dunningSettings).where(eq(dunningSettings.orgId, orgId)).limit(1);
  const window = await loadSendWindow(orgId);
  const rules = await loadChaseRules(orgId);

  const runRows: Array<{ invoiceId: string; sequenceId: string; stepId: string; status: string }> = await db.select({ invoiceId: dunningRuns.invoiceId, sequenceId: dunningRuns.sequenceId, stepId: dunningRuns.stepId, status: dunningRuns.status }).from(dunningRuns).where(inArray(dunningRuns.invoiceId, ids));

  // Chasing rules: what each customer has been sent lately, about any invoice.
  const recentBy = new Map<string, RecentReminder[]>();
  if (rules.minGapDays > 0) {
    const recentRows: Array<{ customerId: string; invoiceId: string; at: Date }> = await db.select({ customerId: invoices.customerId, invoiceId: dunningRuns.invoiceId, at: dunningRuns.createdAt }).from(dunningRuns)
      .innerJoin(invoices, eq(invoices.id, dunningRuns.invoiceId))
      .where(and(eq(dunningRuns.orgId, orgId), inArray(invoices.customerId, customerIds),
        gte(dunningRuns.createdAt, new Date(now.getTime() - rules.minGapDays * 86_400_000)), inArray(dunningRuns.status, [...CONTACTING_STATUSES])));
    for (const r of recentRows) { const l = recentBy.get(r.customerId) ?? []; l.push({ invoiceId: r.invoiceId, at: r.at }); recentBy.set(r.customerId, l); }
  }

  for (const { invoice, customer } of rows as Array<{ invoice: typeof invoices.$inferSelect; customer: typeof customers.$inferSelect }>) {
    const seq = groupedBy.get(customer.id) ?? fallback;
    const hold = holdBy.get(customer.id);
    const runs = seq ? runRows.filter((r) => r.invoiceId === invoice.id && r.sequenceId === seq.id) : [];
    const daysOverdue = Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / 86400000);
    out.set(invoice.id, explain({
      now, invoiceStatus: invoice.status, daysOverdue, customerName: customer.name,
      customerUnsubscribed: !!customer.dndAt,
      hold: hold ? { heldUntil: hold.heldUntil } : null,
      promiseUntil: promiseBy.get(invoice.id) ?? null,
      unhandledReply: hasReply.has(invoice.id), pauseOnReply: seq?.pauseOnReply ?? true,
      scheduleName: seq?.name ?? 'none', scheduleActive: !!seq?.isActive,
      steps: ((seq?.steps ?? []) as Step[]).map((s) => ({ id: s.id, daysFromDue: s.daysFromDue, channel: s.channel })),
      ranStepIds: runs.filter((r) => r.status !== 'failed').map((r) => r.stepId),
      waitingStepIds: runs.filter((r) => r.status === 'scheduled').map((r) => r.stepId),
      failedStepIds: runs.filter((r) => r.status === 'failed').map((r) => r.stepId),
      approvalRequired: isApprovalRequired(settings),
      window,
      hasEmail: !!customer.email, hasPhone: !!customer.phone, smsAllowed: maySendSms(customer),
      balance: Number(invoice.amount) - Number(invoice.amountPaid ?? 0), minBalance: rules.minBalance,
      unappliedCredit: creditBy.get(`${customer.id}:${invoice.currency}`), customerOwed: owedBy.get(`${customer.id}:${invoice.currency}`),
      gapDays: rules.minGapDays, gapBlockedUntil: gapBlockedUntil(recentBy.get(customer.id) ?? [], invoice.id, rules.minGapDays),
    }));
  }
  return out;
}

export async function explainInvoice(orgId: string, invoiceId: string, now = new Date()): Promise<Explanation | null> {
  return (await explainInvoices(orgId, [invoiceId], now)).get(invoiceId) ?? null;
}
