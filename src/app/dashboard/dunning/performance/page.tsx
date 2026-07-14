export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { dunningRuns, dunningSequences, invoices, customers } from '@/db/schema';
import { eq, and, desc, gte, type SQL } from 'drizzle-orm';
import { formatCurrency, formatDate } from '@/lib/utils';
import { paramEnum } from '@/lib/query-params';
import { FilterBar, type DunningChannel, type DaysFilter } from './filter-bar';
import Link from 'next/link';
import { Sparkles, Mail, MessageSquare, Activity, Send, CheckCircle2 } from 'lucide-react';

const CHANNELS: readonly DunningChannel[] = ['all', 'email', 'sms'] as const;
const DAYS: readonly DaysFilter[] = ['7', '30', '90', 'all'] as const;
const DAY_MS: Record<DaysFilter, number | null> = { '7': 7, '30': 30, '90': 90, all: null };

export default async function DunningPerformancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const sp = await searchParams;
  const channel = paramEnum<DunningChannel>(sp, 'channel', CHANNELS, 'all');
  const days = paramEnum<DaysFilter>(sp, 'days', DAYS, '30');
  const since = DAY_MS[days] !== null ? new Date(Date.now() - (DAY_MS[days] as number) * 86400000) : null;

  const conditions: SQL[] = [eq(dunningRuns.orgId, orgId)];
  if (channel !== 'all') conditions.push(eq(dunningRuns.channel, channel));
  if (since) conditions.push(gte(dunningRuns.createdAt, since));

  // All runs for this org, ordered by most recent, filtered by channel + window
  const runs = await db
    .select({ run: dunningRuns, invoice: invoices, customer: customers })
    .from(dunningRuns)
    .innerJoin(invoices, eq(invoices.id, dunningRuns.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(...conditions))
    .orderBy(desc(dunningRuns.createdAt))
    .limit(500);

  // Per-step stats
  const stepStats = new Map<string, { count: number; sent: number; failed: number; paidAfter: number }>();
  for (const r of runs as Array<{ run: typeof dunningRuns.$inferSelect; invoice: typeof invoices.$inferSelect; customer: typeof customers.$inferSelect }>) {
    const key = r.run.stepId;
    const cur = stepStats.get(key) ?? { count: 0, sent: 0, failed: 0, paidAfter: 0 };
    cur.count += 1;
    if (r.run.status === 'sent' || r.run.status === 'delivered') cur.sent += 1;
    if (r.run.status === 'failed') cur.failed += 1;
    if (r.invoice.status === 'paid') cur.paidAfter += 1;
    stepStats.set(key, cur);
  }

  // Per-channel stats
  let emailRuns = 0, smsRuns = 0;
  for (const r of runs as Array<{ run: typeof dunningRuns.$inferSelect; invoice: typeof invoices.$inferSelect; customer: typeof customers.$inferSelect }>) {
    if (r.run.channel === 'email') emailRuns += 1;
    if (r.run.channel === 'sms') smsRuns += 1;
  }

  // Recent activity (filtered to same window the user picked)
  const recent = since ? runs.filter((r: typeof runs[number]) => new Date(r.run.createdAt) >= since) : runs;

  // Customer-level: time-to-pay after dunning
  const customerStats = new Map<string, { name: string; runs: number; paid: number; totalPaid: number }>();
  for (const r of runs as Array<{ run: typeof dunningRuns.$inferSelect; invoice: typeof invoices.$inferSelect; customer: typeof customers.$inferSelect }>) {
    const cur = customerStats.get(r.customer.id) ?? { name: r.customer.name, runs: 0, paid: 0, totalPaid: 0 };
    cur.runs += 1;
    if (r.invoice.status === 'paid') {
      cur.paid += 1;
      cur.totalPaid += Number(r.invoice.amount);
    }
    customerStats.set(r.customer.id, cur);
  }
  const customerList = [...customerStats.entries()]
    .map(([id, s]: [string, { name: string; runs: number; paid: number; totalPaid: number }]) => ({ id, ...s }))
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 10);

  // Top 3 sequence by activation (most-used)
  const [seq] = await db.select().from(dunningSequences).where(and(eq(dunningSequences.orgId, orgId), eq(dunningSequences.isActive, true))).limit(1);

  return (
    <AppShell title="Dunning performance" subtitle="Open rates, response rates, and time-to-pay by step and customer.">
      <FilterBar channel={channel} days={days} />
      <div className="grid sm:grid-cols-4 gap-4 mb-5">
        <Stat icon={<Send className="h-4 w-4 text-brand-600" />} label="Reminders sent" value={String(runs.filter((r: typeof runs[number]) => r.run.status === 'sent' || r.run.status === 'delivered').length)} sub={`${runs.length} total scheduled`} />
        <Stat icon={<Mail className="h-4 w-4 text-brand-600" />} label="Email" value={String(emailRuns)} sub={`${runs.length > 0 ? Math.round((emailRuns / runs.length) * 100) : 0}% of total`} />
        <Stat icon={<MessageSquare className="h-4 w-4 text-brand-600" />} label="SMS" value={String(smsRuns)} sub={`${runs.length > 0 ? Math.round((smsRuns / runs.length) * 100) : 0}% of total`} />
        <Stat icon={<Activity className="h-4 w-4 text-emerald-600" />} label="Last 7 days" value={String(recent.length)} sub="Reminders" />
      </div>

      {runs.length === 0 ? (
        <div className="card text-center py-12">
          <Sparkles className="h-8 w-8 mx-auto text-ink-300" />
          <h3 className="mt-3 font-semibold text-ink-900">No dunning activity yet</h3>
          <p className="mt-1 text-sm text-ink-600">Once invoices go overdue and the cron fires, you'll see reminder stats here.</p>
          <Link href="/dashboard/dunning" className="mt-4 btn-primary text-sm inline-flex">Go to dunning →</Link>
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            {/* Per-step performance */}
            <div className="card">
              <h2 className="h3">By sequence step</h2>
              <p className="text-xs text-ink-500 mt-0.5 mb-3">How each step in your sequence performs. Use this to identify the step that converts best.</p>
              <div className="space-y-3">
                {Array.from(stepStats.entries()).sort().map(([step, s]) => {
                  const successRate = s.count > 0 ? Math.round((s.paidAfter / s.count) * 100) : 0;
                  return (
                    <div key={step}>
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-ink-700">Step {step}</div>
                        <div className="text-xs text-ink-500">{s.count} sent · {s.failed} failed</div>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-ink-100 overflow-hidden flex">
                        <div className="bg-emerald-500 h-full" style={{ width: `${successRate}%` }} />
                        <div className="bg-amber-500 h-full" style={{ width: `${s.count > 0 ? Math.round((s.failed / s.count) * 100) : 0}%` }} />
                      </div>
                      <div className="mt-1 text-xs text-emerald-700">{successRate}% paid after this step</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top customers recovered */}
            <div className="card">
              <h2 className="h3">Top customers recovered</h2>
              <p className="text-xs text-ink-500 mt-0.5 mb-3">Customers whose invoices were paid after dunning. Sort by total recovered.</p>
              <div className="space-y-2">
                {customerList.length === 0 ? (
                  <p className="text-sm text-ink-500">No paid-after-dunning records yet.</p>
                ) : customerList.map((c) => (
                  <Link key={c.id} href={`/dashboard/customers/${c.id}`} className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-ink-50 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-emerald-50 grid place-items-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink-900 truncate">{c.name}</div>
                      <div className="text-xs text-ink-500">{c.runs} reminder{c.runs === 1 ? '' : 's'} · {c.paid} paid</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono font-semibold text-emerald-700">{formatCurrency(c.totalPaid)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Recent activity log */}
          <div className="card">
            <h2 className="h3 mb-3">Recent activity</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 text-xs uppercase tracking-wider">
                    <th className="pb-2 pr-4">Customer</th>
                    <th className="pb-2 px-4">Channel</th>
                    <th className="pb-2 px-4">Step</th>
                    <th className="pb-2 px-4">Status</th>
                    <th className="pb-2 px-4">Sent</th>
                    <th className="pb-2 pl-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.slice(0, 20).map((r: typeof runs[number]) => (
                    <tr key={r.run.id} className="border-t border-ink-100">
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-ink-900">{r.customer.name}</div>
                        <div className="text-xs text-ink-500">{r.invoice.number}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        {r.run.channel === 'sms' ? <span className="badge-neutral text-[10px] inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />SMS</span> : <span className="badge-neutral text-[10px] inline-flex items-center gap-1"><Mail className="h-3 w-3" />Email</span>}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-ink-700">{r.run.stepId}</td>
                      <td className="py-2.5 px-4">
                        <span className={`badge text-[10px] ${r.run.status === 'sent' || r.run.status === 'delivered' ? 'badge-success' : r.run.status === 'failed' ? 'badge-danger' : 'badge-neutral'}`}>{r.run.status}</span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-ink-600">{r.run.sentAt ? formatDate(r.run.sentAt) : '—'}</td>
                      <td className="py-2.5 pl-4 text-right font-mono text-xs">{formatCurrency(r.invoice.amount, r.invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-500 uppercase tracking-wider font-medium">{label}</div>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-display font-bold text-ink-950">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
    </div>
  );
}


