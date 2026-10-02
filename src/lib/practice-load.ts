/**
 * Loads the facts for the practice view. Only organizations the signed-in user is
 * a member of, read from the memberships table; nothing here accepts an org id from
 * the request. One query per kind of fact for all books, not one per book.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { organizations, memberships, invoices, integrations, inboxMessages, dunningApprovals } from '@/db/schema';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import type { BookFacts, Money } from '@/lib/practice';

const OPEN = ['sent', 'viewed', 'overdue', 'partial'] as const;

export async function loadBookCount(userId: string): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(memberships).where(eq(memberships.userId, userId));
  return Number(row?.n ?? 0);
}

export async function loadBooks(userId: string, now: Date = new Date()): Promise<BookFacts[]> {
  const orgRows: Array<{ id: string; name: string }> = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(memberships).innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(eq(memberships.userId, userId));
  if (orgRows.length === 0) return [];
  const orgIds = orgRows.map((o) => o.id);

  const inv: Array<{ orgId: string; currency: string; open: number; owed: string; overdue: number; overdueOwed: string; oldest: number | null }> = await db
    .select({
      orgId: invoices.orgId,
      currency: invoices.currency,
      open: sql<number>`count(*)::int`,
      owed: sql<string>`COALESCE(SUM(${invoices.amount} - ${invoices.amountPaid}), 0)`,
      overdue: sql<number>`count(*) FILTER (WHERE ${invoices.dueDate} < ${now})::int`,
      overdueOwed: sql<string>`COALESCE(SUM(${invoices.amount} - ${invoices.amountPaid}) FILTER (WHERE ${invoices.dueDate} < ${now}), 0)`,
      oldest: sql<number | null>`MAX(FLOOR(EXTRACT(EPOCH FROM (${now}::timestamptz - ${invoices.dueDate})) / 86400)) FILTER (WHERE ${invoices.dueDate} < ${now})`,
    })
    .from(invoices)
    .where(and(inArray(invoices.orgId, orgIds), inArray(invoices.status, [...OPEN])))
    .groupBy(invoices.orgId, invoices.currency);

  await ensureDunningControlSchema();
  const approvals: Array<{ orgId: string; n: number }> = await db
    .select({ orgId: dunningApprovals.orgId, n: sql<number>`count(*)::int` }).from(dunningApprovals)
    .where(inArray(dunningApprovals.orgId, orgIds)).groupBy(dunningApprovals.orgId);
  const replies: Array<{ orgId: string; n: number }> = await db
    .select({ orgId: inboxMessages.orgId, n: sql<number>`count(*)::int` }).from(inboxMessages)
    .where(and(inArray(inboxMessages.orgId, orgIds), eq(inboxMessages.status, 'new'))).groupBy(inboxMessages.orgId);
  const integ: Array<{ orgId: string; status: string; lastSyncAt: Date | null }> = await db
    .select({ orgId: integrations.orgId, status: integrations.status, lastSyncAt: integrations.lastSyncAt }).from(integrations)
    .where(and(inArray(integrations.orgId, orgIds), inArray(integrations.provider, ['quickbooks', 'xero'])));

  return orgRows.map((o) => {
    const money: Money = {};
    let openInvoices = 0, overdueInvoices = 0, oldest = 0;
    for (const r of inv.filter((x) => x.orgId === o.id)) {
      money[r.currency] = { outstanding: Number(r.owed), overdue: Number(r.overdueOwed) };
      openInvoices += r.open; overdueInvoices += r.overdue; oldest = Math.max(oldest, Number(r.oldest ?? 0));
    }
    const mine = integ.filter((i) => i.orgId === o.id);
    const synced = mine.map((i) => i.lastSyncAt).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    return {
      orgId: o.id, name: o.name, openInvoices, overdueInvoices, money, oldestOverdueDays: oldest,
      awaitingApproval: approvals.find((a) => a.orgId === o.id)?.n ?? 0,
      newReplies: replies.find((r) => r.orgId === o.id)?.n ?? 0,
      lastSyncAt: synced,
      integrationError: mine.some((i) => i.status === 'error'),
      hasIntegration: mine.some((i) => i.status === 'connected' || i.status === 'error'),
    };
  });
}
