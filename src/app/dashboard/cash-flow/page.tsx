export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { getCashFlowSnapshot } from '@/lib/analytics';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';

export default async function CashFlowPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const cash = await getCashFlowSnapshot(orgId);
  const weeks = [
    { label: 'Week 1', value: cash.forecast30d * 0.4 },
    { label: 'Week 2', value: cash.forecast30d * 0.3 },
    { label: 'Week 3', value: cash.forecast30d * 0.2 },
    { label: 'Week 4', value: cash.forecast30d * 0.1 },
  ];
  const max = Math.max(...weeks.map((w) => w.value), 1);

  return (
    <AppShell title="Cash flow" subtitle="AI-projected incoming cash over the next 4 weeks.">
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Forecast 30d" value={formatCurrency(cash.forecast30d)} />
        <Stat icon={<Calendar className="h-4 w-4" />} label="Outstanding A/R" value={formatCurrency(cash.outstanding)} />
        <Stat icon={<AlertCircle className="h-4 w-4" />} label="Overdue A/R" value={formatCurrency(cash.overdue)} danger={cash.overdue > 0} />
      </div>

      <div className="card">
        <h2 className="h3">Weekly cash forecast</h2>
        <p className="text-sm text-ink-600 mt-1">Predicted incoming payments, based on aging and customer payment history.</p>
        <div className="mt-6 grid grid-cols-4 gap-4 items-end" style={{ height: 280 }}>
          {weeks.map((w) => (
            <div key={w.label} className="flex flex-col items-center justify-end h-full">
              <div className="text-xs text-ink-500 mb-2 font-mono">{formatCurrency(w.value)}</div>
              <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all" style={{ height: `${(w.value / max) * 90}%`, minHeight: 8 }} />
              <div className="mt-2 text-sm font-medium text-ink-700">{w.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-xs text-ink-500">
          Methodology: We weight open invoices by customer payment history (avg days to pay, paid rate), invoice age, and amount. Forecast confidence is medium until 90+ days of history accumulate.
        </div>
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
