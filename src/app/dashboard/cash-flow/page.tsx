export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { getCashFlowSnapshot } from '@/lib/analytics';
import { CashFlowClient } from './client';
import { db } from '@/db';
import { invoices, customers } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { generateCashFlowForecast } from '@/lib/ai/dunning';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default async function CashFlowPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const cash = await getCashFlowSnapshot(orgId);

  // Build the in-process forecast so we can render SSR fallback
  let baseline: { week1: number; week2: number; week3: number; week4: number; confidence: 'low' | 'medium' | 'high'; narrative: string };
  try {
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
    baseline = await generateCashFlowForecast({ openInvoices, monthlyBurn: 0, currentCash: 0 });
  } catch {
    const total = cash.outstanding;
    baseline = {
      week1: Math.round(total * 0.4),
      week2: Math.round(total * 0.3),
      week3: Math.round(total * 0.2),
      week4: Math.round(total * 0.1),
      confidence: 'low',
      narrative: 'Forecast unavailable — using baseline probability weighting based on outstanding A/R.',
    };
  }

  return (
    <AppShell title="Cash flow" subtitle="AI-projected incoming cash over the next 4 weeks.">
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Forecast 30d" value={formatCurrency(baseline.week1 + baseline.week2 + baseline.week3 + baseline.week4)} />
        <Stat icon={<Calendar className="h-4 w-4" />} label="Outstanding A/R" value={formatCurrency(cash.outstanding)} />
        <Stat icon={<AlertCircle className="h-4 w-4" />} label="Overdue A/R" value={formatCurrency(cash.overdue)} danger={cash.overdue > 0} />
      </div>

      <CashFlowClient baseline={baseline} />

      <div className="mt-5 card text-xs text-ink-500">
        Methodology: We weight open invoices by customer payment history (avg days to pay, paid rate), invoice age, and amount. Forecast confidence improves as 90+ days of history accumulate.
      </div>
    </AppShell>
  );
}

function Stat({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-500 uppercase tracking-wider font-medium">{label}</div>
        <div className={danger ? 'text-red-500' : 'text-ink-400'}>{icon}</div>
      </div>
      <div className={`mt-2 text-2xl font-display font-bold ${danger ? 'text-red-600' : 'text-ink-950'}`}>{value}</div>
    </div>
  );
}
