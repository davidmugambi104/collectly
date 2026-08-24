import { db } from '@/db';
import { invoices, customers, payments } from '@/db/schema';
import { eq, and, sum, count, gte, lte, sql, desc } from 'drizzle-orm';
import { bucketFor, daysOverdue } from '@/lib/utils';

export interface AgingReport {
  total: number;
  buckets: Record<'current' | '1-30' | '31-60' | '61-90' | '90+', { count: number; amount: number }>;
  customerCount: number;
  invoiceCount: number;
  hasData: boolean;
}

export async function getAgingReport(orgId: string): Promise<AgingReport> {
  const rows = await db
    .select({
      id: invoices.id,
      amount: invoices.amount,
      amountPaid: invoices.amountPaid,
      status: invoices.status,
      dueDate: invoices.dueDate,
      customerId: invoices.customerId,
    })
    .from(invoices)
    .where(eq(invoices.orgId, orgId));

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
    customerIds.add(inv.customerId);
  }

  const [{ invoiceCount }] = await db
    .select({ invoiceCount: count() })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), eq(invoices.status, 'overdue')));

  return {
    total,
    buckets,
    customerCount: customerIds.size,
    invoiceCount: Number(invoiceCount),
    hasData: rows.length > 0,
  };
}

export interface CashFlowSnapshot {
  outstanding: number;
  overdue: number;
  collectedThisMonth: number;
  collectedLastMonth: number;
  /** % change in outstanding A/R vs the prior 30-day window. null when we don't have 30+ days of data. */
  outstandingTrend: number | null;
  /** % change in collected this month vs last month. null when both are zero. */
  collectedTrend: number | null;
  /** Real average DSO across paid invoices in the last 90 days. null when no paid invoices. */
  avgDaysToPay: number | null;
  /** Forecast 30-day incoming cash. Naive = outstanding * 0.7 unless we have AI forecast. */
  forecast30d: number;
  /** True if we have enough paid-invoice history (>= 5 paid) to trust the forecast. */
  forecastReliable: boolean;
}

export async function getCashFlowSnapshot(orgId: string): Promise<CashFlowSnapshot> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start30Ago = new Date(now.getTime() - 30 * 86400000);
  new Date(now.getTime() - 60 * 86400000);
  const start90Ago = new Date(now.getTime() - 90 * 86400000);

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

  // Outstanding 30 days ago (snapshot)
  const [{ outstanding30 }] = await db
    .select({ outstanding30: sum(sql<string>`${invoices.amount} - ${invoices.amountPaid}`) })
    .from(invoices)
    .where(and(
      eq(invoices.orgId, orgId),
      sql`${invoices.status} NOT IN ('paid', 'written_off')`,
      lte(invoices.createdAt, start30Ago),
    ));

  // Real DSO: average days from issueDate to paidAt for paid invoices in last 90 days
  const paidRows = await db
    .select({ issueDate: invoices.issueDate, paidAt: invoices.paidAt })
    .from(invoices)
    .innerJoin(payments, eq(payments.invoiceId, invoices.id))
    .where(and(
      eq(invoices.orgId, orgId),
      eq(invoices.status, 'paid'),
      gte(payments.paidAt, start90Ago),
    ));
  let avgDaysToPay: number | null = null;
  if (paidRows.length >= 1) {
    const sumDays = paidRows.reduce((s: number, r: typeof paidRows[number]) => {
      const d = Math.floor((new Date(r.paidAt!).getTime() - new Date(r.issueDate).getTime()) / 86400000);
      return s + Math.max(0, d);
    }, 0);
    avgDaysToPay = Math.round(sumDays / paidRows.length);
  }

  const outstandingVal = Number(outstanding ?? 0);
  const outstanding30Val = Number(outstanding30 ?? 0);
  const collectedThisVal = Number(collectedThisMonth ?? 0);
  const collectedLastVal = Number(collectedLastMonth ?? 0);

  // Trends: only show when we have prior data to compare to
  const outstandingTrend = outstanding30Val > 0
    ? Math.round(((outstandingVal - outstanding30Val) / outstanding30Val) * 100)
    : null;
  const collectedTrend = collectedLastVal > 0
    ? Math.round(((collectedThisVal - collectedLastVal) / collectedLastVal) * 100)
    : collectedThisVal > 0
    ? null // first month with collection, can't compare
    : null;

  // Naive forecast: scale by the average paid-rate, with a floor.
  // If we have no paid history yet, fall back to 70% — but flag as unreliable.
  const forecastReliable = paidRows.length >= 5;
  let forecast30d: number;
  if (avgDaysToPay !== null && avgDaysToPay > 0) {
    // Weight forecast by 1 - (avgDaysToPay / 45) to capture the "fraction of A/R we expect to collect in 30 days"
    const collectionVelocity = Math.max(0.3, Math.min(0.95, 1 - (avgDaysToPay - 14) / 60));
    forecast30d = Math.round(outstandingVal * collectionVelocity);
  } else {
    forecast30d = Math.round(outstandingVal * 0.7);
  }

  return {
    outstanding: outstandingVal,
    overdue: Number(overdue ?? 0),
    collectedThisMonth: collectedThisVal,
    collectedLastMonth: collectedLastVal,
    outstandingTrend,
    collectedTrend,
    avgDaysToPay,
    forecast30d,
    forecastReliable,
  };
}

/**
 * Customer-level risk + recommended action. Powers the customer detail page
 * and the dashboard's AI insights panel.
 */
export interface CustomerInsight {
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  openInvoices: number;
  openBalance: number;
  oldestInvoiceDays: number;
  avgDaysToPay: number;
  paidRate: number;
  riskScore: number; // 0..100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
  recommendedChannel: 'email' | 'sms' | 'phone';
  predictedPayment7d: number; // 0..1
}

export async function getCustomerInsights(orgId: string, limit = 50): Promise<CustomerInsight[]> {
  const custList = await db.select().from(customers).where(eq(customers.orgId, orgId));
  const open = await db
    .select({ customerId: invoices.customerId, amount: invoices.amount, amountPaid: invoices.amountPaid, dueDate: invoices.dueDate, status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), sql`${invoices.status} NOT IN ('paid', 'written_off')`));

  const byCustomer = new Map<string, { open: number; balance: number; oldestDays: number }>();
  for (const inv of open) {
    const cur = byCustomer.get(inv.customerId) ?? { open: 0, balance: 0, oldestDays: 0 };
    cur.open += 1;
    cur.balance += Number(inv.amount) - Number(inv.amountPaid);
    const days = daysOverdue(inv.dueDate);
    if (days > cur.oldestDays) cur.oldestDays = days;
    byCustomer.set(inv.customerId, cur);
  }

  const out: CustomerInsight[] = [];
  for (const c of custList) {
    const cur = byCustomer.get(c.id);
    if (!cur || cur.open === 0) continue;
    const beh = c.paymentBehavior ?? { avgDaysToPay: 30, paidRate: 1, lastPaidAt: null, riskScore: 20 };
    // Compute risk: weighted by oldest days, balance, paid rate
    const ageScore = Math.min(60, cur.oldestDays * 0.6);
    const paidRateScore = Math.round((1 - beh.paidRate) * 30);
    const balanceScore = Math.min(10, Math.log10(Math.max(1, cur.balance)) * 2);
    const riskScore = Math.min(100, Math.round(ageScore + paidRateScore + balanceScore));

    const riskLevel: CustomerInsight['riskLevel'] =
      riskScore >= 75 ? 'critical' :
      riskScore >= 50 ? 'high' :
      riskScore >= 25 ? 'medium' :
      'low';

    // Recommended action
    let recommendedAction = '';
    let recommendedChannel: 'email' | 'sms' | 'phone' = 'email';
    if (riskLevel === 'critical') {
      recommendedAction = `Pause new work. Call the customer directly to confirm payment plan. ${cur.oldestDays}-day-old invoice is at risk of write-off.`;
      recommendedChannel = 'phone';
    } else if (riskLevel === 'high') {
      recommendedAction = `Send a firm-tone email + SMS reminder today. ${cur.oldestDays}-day-old invoice needs immediate attention.`;
      recommendedChannel = c.phone ? 'sms' : 'email';
    } else if (riskLevel === 'medium') {
      recommendedAction = `Send a friendly-tone email reminder. Invoice is past due but customer has good payment history overall.`;
      recommendedChannel = 'email';
    } else {
      recommendedAction = `Low risk. No action needed. Customer typically pays within ${beh.avgDaysToPay} days.`;
      recommendedChannel = 'email';
    }

    // Predicted payment within 7 days: based on paid rate + age
    const daysToPay = Math.max(0, beh.avgDaysToPay - cur.oldestDays);
    const baseProb = beh.paidRate;
    const agePenalty = cur.oldestDays > 60 ? 0.4 : cur.oldestDays > 30 ? 0.2 : 0;
    const predictedPayment7d = Math.max(0, Math.min(1, baseProb * 0.4 - agePenalty + (daysToPay > 0 ? 0.1 : 0)));

    out.push({
      customerId: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      openInvoices: cur.open,
      openBalance: Math.round(cur.balance),
      oldestInvoiceDays: cur.oldestDays,
      avgDaysToPay: beh.avgDaysToPay,
      paidRate: beh.paidRate,
      riskScore,
      riskLevel,
      recommendedAction,
      recommendedChannel,
      predictedPayment7d: Math.round(predictedPayment7d * 100) / 100,
    });
  }

  // Sort: highest risk first, then highest balance
  out.sort((a, b) => b.riskScore - a.riskScore || b.openBalance - a.openBalance);
  return out.slice(0, limit);
}

/**
 * AI insights — the headline panel on the dashboard. Generates prioritized,
 * actionable recommendations the user can act on with one click.
 */
export interface AIInsight {
  id: string;
  priority: 1 | 2 | 3;
  category: 'risk' | 'opportunity' | 'forecast' | 'action';
  title: string;
  detail: string;
  cta: { href: string; label: string };
  /** Optional dollar amount tied to the insight. */
  amount?: number;
}

export async function getAIInsights(orgId: string): Promise<AIInsight[]> {
  const [aging, cash, insights] = await Promise.all([
    getAgingReport(orgId),
    getCashFlowSnapshot(orgId),
    getCustomerInsights(orgId, 5),
  ]);

  if (!aging.hasData) {
    return [
      {
        id: 'no-data',
        priority: 1,
        category: 'action',
        title: 'Connect QuickBooks or Xero to get started',
        detail: 'We pull in your customers, invoices, and payment history. 60-second setup. Or load sample data to explore the product first.',
        cta: { href: '/dashboard/integrations', label: 'Connect or load demo data' },
      },
    ];
  }

  const out: AIInsight[] = [];

  // 1. Critical risk: any customer at 90+ days
  const criticalCustomers = insights.filter((i) => i.riskLevel === 'critical');
  if (criticalCustomers.length > 0) {
    const top = criticalCustomers[0];
    out.push({
      id: 'critical-risk',
      priority: 1,
      category: 'risk',
      title: `${top.name} is at write-off risk`,
      detail: `$${top.openBalance.toLocaleString()} outstanding across ${top.openInvoices} invoice${top.openInvoices === 1 ? '' : 's'}, oldest is ${top.oldestInvoiceDays} days past due. Predicted payment in 7 days: ${Math.round(top.predictedPayment7d * 100)}%. ${top.recommendedAction}`,
      cta: { href: `/dashboard/customers/${top.customerId}`, label: `Review ${top.name}` },
      amount: top.openBalance,
    });
  }

  // 2. High-value overdue: top by balance
  const topByBalance = [...insights].sort((a, b) => b.openBalance - a.openBalance)[0];
  if (topByBalance && topByBalance.riskLevel !== 'critical' && topByBalance.openBalance > 5000) {
    out.push({
      id: 'high-value-overdue',
      priority: 2,
      category: 'action',
      title: `$${topByBalance.openBalance.toLocaleString()} stuck at ${topByBalance.name}`,
      detail: `Largest single exposure on your books. ${topByBalance.recommendedAction}`,
      cta: { href: `/dashboard/customers/${topByBalance.customerId}`, label: 'Take action' },
      amount: topByBalance.openBalance,
    });
  }

  // 3. Forecast insight
  if (cash.outstanding > 0) {
    const confidenceNote = cash.forecastReliable ? '' : ' (low confidence — we need 5+ paid invoices to calibrate)';
    out.push({
      id: 'forecast',
      priority: 3,
      category: 'forecast',
      title: `$${cash.forecast30d.toLocaleString()} expected in next 30 days`,
      detail: cash.avgDaysToPay
        ? `Based on your ${cash.avgDaysToPay}-day average DSO across ${cash.outstanding.toLocaleString()} of total A/R.${confidenceNote}`
        : `Estimated from outstanding A/R. We need more paid-invoice history to improve this forecast.`,
      cta: { href: '/dashboard/cash-flow', label: 'See forecast' },
      amount: cash.forecast30d,
    });
  }

  // 4. Trending up or down
  if (cash.collectedTrend !== null && Math.abs(cash.collectedTrend) > 10) {
    out.push({
      id: 'collection-trend',
      priority: 3,
      category: cash.collectedTrend > 0 ? 'opportunity' : 'risk',
      title: cash.collectedTrend > 0
        ? `Collections up ${cash.collectedTrend}% this month`
        : `Collections down ${Math.abs(cash.collectedTrend)}% this month`,
      detail: cash.collectedTrend > 0
        ? `You're collecting $${(cash.collectedThisMonth - cash.collectedLastMonth).toLocaleString()} more than last month. Keep it up.`
        : `$${Math.abs(cash.collectedThisMonth - cash.collectedLastMonth).toLocaleString()} less collected vs last month. Worth a 5-min review of the dunning sequence.`,
      cta: { href: '/dashboard/dunning', label: 'Review sequence' },
    });
  }

  // 5. Aging concentration
  const totalOverdue = aging.buckets['1-30'].amount + aging.buckets['31-60'].amount + aging.buckets['61-90'].amount + aging.buckets['90+'].amount;
  if (totalOverdue > 0 && aging.total > 0) {
    const overduePct = Math.round((totalOverdue / aging.total) * 100);
    if (overduePct > 50) {
      out.push({
        id: 'aging-concentration',
        priority: 2,
        category: 'risk',
        title: `${overduePct}% of your A/R is overdue`,
        detail: `$${totalOverdue.toLocaleString()} sitting past due across ${aging.invoiceCount} invoice${aging.invoiceCount === 1 ? '' : 's'}. Industry best-in-class is <20%. Turning on AI dunning typically cuts this by 40% in 30 days.`,
        cta: { href: '/dashboard/dunning', label: 'Enable AI dunning' },
        amount: totalOverdue,
      });
    }
  }

  return out;
}

/**
 * Exec summary — used in the weekly export. Returns a structured object
 * the user can render or send to themselves.
 */
export interface ExecSummary {
  periodStart: string;
  periodEnd: string;
  totalAR: number;
  overdue: number;
  collected: number;
  collectedPrior: number;
  dso: number | null;
  topRisk: { customer: string; amount: number; days: number } | null;
  topWin: { customer: string; amount: number } | null;
  forecast30d: number;
  generatedAt: string;
  narrative: string;
}

export async function getExecSummary(orgId: string): Promise<ExecSummary> {
  const [aging, cash, insights] = await Promise.all([
    getAgingReport(orgId),
    getCashFlowSnapshot(orgId),
    getCustomerInsights(orgId, 20),
  ]);
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const periodEnd = now.toISOString().slice(0, 10);

  const critical = insights.find((i) => i.riskLevel === 'critical');
  const topRisk = critical
    ? { customer: critical.name, amount: critical.openBalance, days: critical.oldestInvoiceDays }
    : insights[0]
    ? { customer: insights[0].name, amount: insights[0].openBalance, days: insights[0].oldestInvoiceDays }
    : null;

  // Top win: largest payment in the period (last 30d)
  const topWinRow = await db
    .select({ amount: payments.amount, customerName: customers.name })
    .from(payments)
    .innerJoin(customers, eq(customers.id, payments.customerId))
    .where(and(eq(payments.orgId, orgId), gte(payments.paidAt, new Date(now.getTime() - 30 * 86400000))))
    .orderBy(desc(payments.amount))
    .limit(1);

  const topWin = topWinRow[0] ? { customer: topWinRow[0].customerName, amount: Number(topWinRow[0].amount) } : null;

  const narrative = [
    `Total A/R: $${aging.total.toLocaleString()}.`,
    `Overdue: $${(aging.buckets['1-30'].amount + aging.buckets['31-60'].amount + aging.buckets['61-90'].amount + aging.buckets['90+'].amount).toLocaleString()}.`,
    cash.avgDaysToPay ? `DSO: ${cash.avgDaysToPay} days.` : '',
    `Collected this month: $${cash.collectedThisMonth.toLocaleString()}.`,
    cash.collectedTrend !== null ? `Trend: ${cash.collectedTrend > 0 ? '+' : ''}${cash.collectedTrend}% vs last month.` : '',
    topRisk ? `Top risk: ${topRisk.customer} ($${topRisk.amount.toLocaleString()}, ${topRisk.days} days).` : '',
  ].filter(Boolean).join(' ');

  return {
    periodStart,
    periodEnd,
    totalAR: aging.total,
    overdue: aging.buckets['1-30'].amount + aging.buckets['31-60'].amount + aging.buckets['61-90'].amount + aging.buckets['90+'].amount,
    collected: cash.collectedThisMonth,
    collectedPrior: cash.collectedLastMonth,
    dso: cash.avgDaysToPay,
    topRisk,
    topWin,
    forecast30d: cash.forecast30d,
    generatedAt: now.toISOString(),
    narrative,
  };
}
