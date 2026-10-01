/**
 * The database half of scheduled statements. The scheduler calls
 * generateStatementDrafts; it only ever creates drafts. Sending happens when a
 * person approves one (decideStatementDraft), through sendStatementEmail.
 */
import { and, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { customers, dunningHolds, dunningSettings, invoices, statementDrafts } from '@/db/schema';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { buildStatement } from '@/lib/statements';
import { isStatementDay, shouldDraftStatement, statementPeriod } from '@/lib/statement-schedule';
import { sendStatementEmail } from '@/lib/statements-send';
import { recordEvent } from '@/lib/events';

const MAX_DRAFTS_PER_ORG_PER_RUN = 200;

/** Create this month's drafts for every organisation that turned monthly statements on. Safe to run any number of times. */
export async function generateStatementDrafts(now: Date = new Date(), onlyOrgId?: string): Promise<{ created: number; orgs: number }> {
  await ensureDunningControlSchema();
  const settings = await db.select({ orgId: dunningSettings.orgId, day: dunningSettings.statementsDay })
    .from(dunningSettings)
    .where(onlyOrgId ? and(eq(dunningSettings.statementsEnabled, true), eq(dunningSettings.orgId, onlyOrgId)) : eq(dunningSettings.statementsEnabled, true));
  const period = statementPeriod(now);
  let created = 0, orgs = 0;

  for (const s of settings) {
    if (!isStatementDay(now, Number(s.day))) continue;
    orgs += 1;
    // Everything still owed, grouped by customer, in one query.
    const rows = await db
      .select({ customerId: invoices.customerId, number: invoices.number, currency: invoices.currency, status: invoices.status, issueDate: invoices.issueDate, dueDate: invoices.dueDate, amount: invoices.amount, amountPaid: invoices.amountPaid })
      .from(invoices)
      .where(and(eq(invoices.orgId, s.orgId), inArray(invoices.status, ['sent', 'viewed', 'partial', 'overdue', 'disputed'])))
      .limit(20000);
    if (rows.length === 0) continue;
    const byCustomer = new Map<string, typeof rows>();
    for (const r of rows) byCustomer.set(r.customerId, [...(byCustomer.get(r.customerId) ?? []), r]);

    const custs = await db.select({ id: customers.id, email: customers.email, dndAt: customers.dndAt }).from(customers)
      .where(and(eq(customers.orgId, s.orgId), inArray(customers.id, [...byCustomer.keys()])));
    const held = new Set<string>((await db.select({ id: dunningHolds.customerId }).from(dunningHolds)
      .where(and(eq(dunningHolds.orgId, s.orgId), or(isNull(dunningHolds.heldUntil), gt(dunningHolds.heldUntil, now))))).map((h: { id: string }) => h.id));

    let made = 0;
    for (const c of custs) {
      if (made >= MAX_DRAFTS_PER_ORG_PER_RUN) break;
      const statement = buildStatement(byCustomer.get(c.id) ?? [], now);
      const overdueCents = statement.sections.reduce((sum, x) => sum + x.overdueCents, 0);
      if (!shouldDraftStatement({ email: c.email, unsubscribedAt: c.dndAt, onHold: held.has(c.id), overdueCents })) continue;
      const inserted = await db.insert(statementDrafts).values({ orgId: s.orgId, customerId: c.id, period })
        .onConflictDoNothing({ target: [statementDrafts.customerId, statementDrafts.period] }).returning({ id: statementDrafts.id });
      made += inserted.length;
    }
    created += made;
  }
  return { created, orgs };
}

/**
 * Approve or skip a draft. Either one first claims the row with a single UPDATE ... RETURNING
 * on status 'pending', so a double click, a second tab or the scheduler cannot act twice.
 * Approving re-checks everything at the moment of sending (paid since, unsubscribed since).
 * If the send fails the draft goes back to pending with the reason, so it can be retried.
 */
export async function decideStatementDraft(o: { orgId: string; userId: string | null; draftId: string; action: 'approve' | 'skip' }): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  await ensureDunningControlSchema();
  const claimed = await db.update(statementDrafts)
    .set({ status: o.action === 'approve' ? 'sending' : 'skipped', decidedAt: new Date(), error: null })
    .where(and(eq(statementDrafts.id, o.draftId), eq(statementDrafts.orgId, o.orgId), eq(statementDrafts.status, 'pending')))
    .returning({ customerId: statementDrafts.customerId });
  if (claimed.length === 0) return { ok: false, status: 409, error: 'That statement was already approved or skipped.' };
  if (o.action === 'skip') {
    await recordEvent({ orgId: o.orgId, type: 'statement.draft.skipped', actorId: o.userId ?? undefined, payload: { draftId: o.draftId } });
    return { ok: true };
  }
  const result = await sendStatementEmail({ orgId: o.orgId, userId: o.userId, customerId: claimed[0].customerId, scheduled: true });
  if (!result.ok) {
    // Nothing was sent: put it back so the owner can retry or skip, with the reason.
    await db.update(statementDrafts).set({ status: 'pending', decidedAt: null, error: result.error }).where(eq(statementDrafts.id, o.draftId));
    return result;
  }
  await db.update(statementDrafts).set({ status: 'sent' }).where(eq(statementDrafts.id, o.draftId));
  return { ok: true };
}

export async function countPendingStatementDrafts(orgId: string): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(statementDrafts).where(and(eq(statementDrafts.orgId, orgId), eq(statementDrafts.status, 'pending')));
  return Number(row?.n ?? 0);
}
