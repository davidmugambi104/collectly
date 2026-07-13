import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { db } from '@/db';
import { invoices, customers } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { generateCashFlowForecast } from '@/lib/ai/dunning';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

export async function POST(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let currentCash = 0;
  let monthlyBurn = 0;
  try { ({ currentCash = 0, monthlyBurn = 0 } = await req.json()); } catch {}

  const open = await db
    .select({ amount: invoices.amount, dueDate: invoices.dueDate, customerId: invoices.customerId })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), ne(invoices.status, 'paid')));

  const custList = await db.select().from(customers).where(eq(customers.orgId, orgId));
  const custMap = new Map<string, typeof custList[number]>(custList.map((c: typeof custList[number]) => [c.id, c]));

  const now = Date.now();
  const openInvoices = open.map((inv: typeof open[number]) => {
    const c = custMap.get(inv.customerId);
    const behavior = (c as any)?.paymentBehavior;
    const days = Math.max(0, Math.floor((now - new Date(inv.dueDate).getTime()) / 86400000));
    return {
      amount: Number(inv.amount),
      dueDate: inv.dueDate.toISOString().slice(0, 10),
      daysOverdue: days,
      customerPaidRate: behavior?.paidRate ?? 0.85,
      customerAvgDays: behavior?.avgDaysToPay ?? 30,
    };
  });

  try {
    const forecast = await generateCashFlowForecast({ openInvoices, monthlyBurn, currentCash });
    return NextResponse.json(forecast);
  } catch {
    const total = openInvoices.reduce((s: number, i: typeof openInvoices[number]) => s + i.amount * (i.customerPaidRate ?? 0.7), 0);
    return NextResponse.json({
      week1: Math.round(total * 0.4),
      week2: Math.round(total * 0.3),
      week3: Math.round(total * 0.2),
      week4: Math.round(total * 0.1),
      confidence: 'low' as const,
      narrative: 'Forecast unavailable — using baseline probability weighting.',
    });
  }
}
