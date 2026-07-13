import { db } from '@/db';
import { invoices, customers, payments, events } from '@/db/schema';
import { eq, and, sum, count, isNull, gte, lte, sql } from 'drizzle-orm';
import { bucketFor, daysOverdue } from '@/lib/utils';

export interface AgingReport {
  total: number;
  buckets: Record<'current' | '1-30' | '31-60' | '61-90' | '90+', { count: number; amount: number }>;
  customerCount: number;
  invoiceCount: number;
}

export async function getAgingReport(orgId: string): Promise<AgingReport> {
  const rows = await db
    .select({
      id: invoices.id,
      amount: invoices.amount,
      amountPaid: invoices.amountPaid,
      status: invoices.status,
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId)));

  const buckets: AgingReport['buckets'] = {
    current: { count: 0, amount: 0 },
    '1-30': { count: 0, amount: 0 },
    '31-60': { count: 0, amount: 0 },
    '61-90': { count: 0, amount: 0 },
    '90+': { count: 0, amount: 0 },
  };
  let total = 0;
  const customerIds = new Set<string>();

  for (const inv of rows) {
    if (inv.status === 'paid' || inv.status === 'written_off') continue;
    const balance = Number(inv.amount) - Number(inv.amountPaid);
    if (balance <= 0) continue;
    const days = daysOverdue(inv.dueDate);
    const bucket = bucketFor(days);
    buckets[bucket].count += 1;
    buckets[bucket].amount += balance;
    total += balance;
  }

  const [{ invoiceCount }] = await db
    .select({ invoiceCount: count() })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), eq(invoices.status, 'overdue')));

  return { total, buckets, customerCount: customerIds.size, invoiceCount: Number(invoiceCount) };
}

export interface CashFlowSnapshot {
  outstanding: number;
  overdue: number;
  collectedThisMonth: number;
  collectedLastMonth: number;
  avgDaysToPay: number;
  forecast30d: number;
}

export async function getCashFlowSnapshot(orgId: string): Promise<CashFlowSnapshot> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [{ outstanding }] = await db
    .select({ outstanding: sum(sql<string>`${invoices.amount} - ${invoices.amountPaid}`) })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), sql`${invoices.status} NOT IN ('paid', 'written_off')`));

  const [{ overdue }] = await db
    .select({ overdue: sum(sql<string>`${invoices.amount} - ${invoices.amountPaid}`) })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), sql`${invoices.dueDate} < NOW()`));

  const [{ collectedThisMonth }] = await db
    .select({ collectedThisMonth: sum(payments.amount) })
    .from(payments)
    .where(and(eq(payments.orgId, orgId), gte(payments.paidAt, startOfMonth)));

  const [{ collectedLastMonth }] = await db
    .select({ collectedLastMonth: sum(payments.amount) })
    .from(payments)
    .where(and(eq(payments.orgId, orgId), gte(payments.paidAt, startOfLastMonth), lte(payments.paidAt, startOfMonth)));

  return {
    outstanding: Number(outstanding ?? 0),
    overdue: Number(overdue ?? 0),
    collectedThisMonth: Number(collectedThisMonth ?? 0),
    collectedLastMonth: Number(collectedLastMonth ?? 0),
    avgDaysToPay: 32, // TODO: compute real
    forecast30d: Number(outstanding ?? 0) * 0.7,
  };
}
