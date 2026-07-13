import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect, notFound } from 'next/navigation';
import { db, schema } from '@/db';
import { customers, invoices, payments, dunningRuns } from '@/db/schema';
import { eq, desc, sum, sql } from 'drizzle-orm';
import { formatCurrency, formatDate, daysOverdue } from '@/lib/utils';
import { getCustomerInsights } from '@/lib/analytics';
import { ArrowLeft, Mail, Phone, MessageSquare, TrendingUp, AlertCircle, DollarSign, Clock, CheckCircle2, Sparkles, Zap, Target, Send, Activity, Building2 } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { userId, orgId } = await getAuth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');
  const { id } = await params;

  const [cust] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!cust || cust.orgId !== orgId) notFound();

  // Use the new insights engine for richer risk + action
  const allInsights = await getCustomerInsights(orgId, 100);
  const insight = allInsights.find((c) => c.customerId === id);

  const invs = await db.select().from(invoices).where(eq(invoices.customerId, id)).orderBy(desc(invoices.issueDate)).limit(50);
  const [{ outstanding }] = await db.select({ outstanding: sum(sql<string>`${invoices.amount} - ${invoices.amountPaid}`) }).from(invoices).where(sql`${invoices.customerId} = ${id} AND ${invoices.status} NOT IN ('paid', 'written_off')`);
  const [{ paid }] = await db.select({ paid: sum(payments.amount) }).from(payments).where(eq(payments.customerId, id));
  const [{ paidCount }] = await db.select({ paidCount: sql<number>`COUNT(*)::int` }).from(invoices).where(sql`${invoices.customerId} = ${id} AND ${invoices.status} = 'paid'`);
  const [{ totalCount }] = await db.select({ totalCount: sql<number>`COUNT(*)::int` }).from(invoices).where(eq(invoices.customerId, id));
  const runs = await db.select().from(dunningRuns).where(eq(dunningRuns.invoiceId, id)).orderBy(desc(dunningRuns.createdAt)).limit(20);

  const paidRate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 100;
  const avgDays = cust.paymentBehavior?.avgDaysToPay ?? 30;

  return (
    <AppShell title={cust.name} subtitle={cust.company ?? 'Customer'}>
      <div className="mb-4">
        <Link href="/dashboard/customers" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900">
          <ArrowLeft className="h-3.5 w-3.5" />All customers
        </Link>
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mb-5">
        <Stat icon={<DollarSign className="h-4 w-4" />} label="Outstanding" value={formatCurrency(Number(outstanding ?? 0))} danger={Number(outstanding ?? 0) > 0} />
        <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Lifetime paid" value={formatCurrency(Number(paid ?? 0))} />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Paid rate" value={`${paidRate}%`} sub={`${paidCount} of ${totalCount} invoices`} />
        <Stat icon={<Clock className="h-4 w-4" />} label="Avg days to pay" value={`${avgDays}d`} />
      </div>

      {/* AI Recommendation */}
      {insight && insight.openInvoices > 0 && (
        <div className="mb-5 card overflow-hidden">
          <div className="flex items-start gap-3">
            <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${insight.riskLevel === 'critical' ? 'bg-red-100 text-red-700' : insight.riskLevel === 'high' ? 'bg-red-50 text-red-600' : insight.riskLevel === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-ink-900">AI recommendation</h2>
                <span className={`badge text-[10px] ${insight.riskLevel === 'critical' ? 'badge-danger' : insight.riskLevel === 'high' ? 'badge-danger' : insight.riskLevel === 'medium' ? 'badge-warn' : 'badge-success'}`}>{insight.riskLevel} risk</span>
                <span className="text-xs text-ink-500">score {insight.riskScore}/100</span>
              </div>
              <p className="mt-2 text-sm text-ink-700 leading-relaxed">{insight.recommendedAction}</p>
              <div className="mt-3 flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5 text-ink-600">
                  <Target className="h-3.5 w-3.5" />
                  <span>Predicted payment in 7d: <b className="text-ink-900">{Math.round(insight.predictedPayment7d * 100)}%</b></span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-ink-600">
                  <Activity className="h-3.5 w-3.5" />
                  <span>Suggested channel: <b className="text-ink-900 capitalize">{insight.recommendedChannel}</b></span>
                </span>
              </div>
              {invs.filter((i: typeof invs[number]) => i.status !== 'paid').length > 0 && (
                <div className="mt-3 pt-3 border-t border-ink-100">
                  <div className="text-xs font-semibold text-ink-700 mb-2">Send a {insight.riskLevel === 'critical' ? 'final' : insight.riskLevel === 'high' ? 'firm' : 'friendly'} reminder:</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {invs.filter((i: typeof invs[number]) => i.status !== 'paid').slice(0, 3).map((inv: typeof invs[number]) => (
                      <Link
                        key={inv.id}
                        href={`/dashboard/invoices/${inv.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-md border border-brand-200"
                      >
                        <Send className="h-3 w-3" />
                        {inv.number} · {formatCurrency(Number(inv.amount) - Number(inv.amountPaid), inv.currency)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="card">
            <h2 className="h3">Invoices</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 text-xs uppercase tracking-wider">
                    <th className="pb-2 pr-4">Invoice</th>
                    <th className="pb-2 px-4">Status</th>
                    <th className="pb-2 px-4">Due</th>
                    <th className="pb-2 px-4 text-right">Amount</th>
                    <th className="pb-2 pl-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {invs.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-ink-500">No invoices yet.</td></tr>}
                  {invs.map((inv: typeof invs[number]) => {
                    const days = daysOverdue(inv.dueDate);
                    const bal = Number(inv.amount) - Number(inv.amountPaid);
                    return (
                      <tr key={inv.id} className="border-t border-ink-100 hover:bg-ink-50">
                        <td className="py-2.5 pr-4"><Link href={`/dashboard/invoices/${inv.id}`} className="font-mono text-xs text-brand-600 hover:text-brand-700">{inv.number}</Link></td>
                        <td className="py-2.5 px-4">{inv.status === 'paid' ? <span className="badge-success">Paid</span> : days > 0 ? <span className="badge-danger">{days}d</span> : <span className="badge-neutral capitalize">{inv.status}</span>}</td>
                        <td className="py-2.5 px-4 text-ink-700">{formatDate(inv.dueDate)}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(inv.amount, inv.currency)}</td>
                        <td className="py-2.5 pl-4 text-right font-mono font-semibold">{formatCurrency(bal, inv.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-ink-900">Contact</h2>
            <div className="mt-3 space-y-1.5 text-sm">
              {cust.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-ink-500" /><a href={`mailto:${cust.email}`} className="text-ink-700 hover:text-brand-600">{cust.email}</a></div>}
              {cust.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-ink-500" /><a href={`tel:${cust.phone}`} className="text-ink-700 hover:text-brand-600">{cust.phone}</a></div>}
              {cust.company && <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-ink-500" /><span className="text-ink-700">{cust.company}</span></div>}
            </div>
            <div className="mt-3 pt-3 border-t border-ink-100 text-sm">
              <div className="text-xs text-ink-500">Preferred channel</div>
              <div className="mt-1 flex items-center gap-1.5 font-medium capitalize">
                {cust.preferredChannel === 'sms' ? <MessageSquare className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                {cust.preferredChannel}
              </div>
            </div>
          </div>

          {insight && (
            <div className="card">
              <h2 className="font-semibold text-ink-900">Risk score</h2>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                  <div className={`h-full transition-all ${insight.riskLevel === 'critical' ? 'bg-red-500' : insight.riskLevel === 'high' ? 'bg-red-400' : insight.riskLevel === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${insight.riskScore}%` }} />
                </div>
                <span className="text-sm font-mono text-ink-700 font-semibold">{insight.riskScore}</span>
              </div>
              <p className="mt-2 text-xs text-ink-600">
                {insight.riskLevel === 'critical' ? 'High risk — invoice may need write-off. Call the customer directly.' :
                 insight.riskLevel === 'high' ? 'High risk — send a firm reminder today.' :
                 insight.riskLevel === 'medium' ? 'Moderate risk — friendly nudge recommended.' :
                 'Low risk — customer is a reliable payer.'}
              </p>
              <div className="mt-3 pt-3 border-t border-ink-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-ink-500">7d payment prob.</div>
                  <div className="mt-0.5 font-mono font-semibold">{Math.round(insight.predictedPayment7d * 100)}%</div>
                </div>
                <div>
                  <div className="text-ink-500">Open invoices</div>
                  <div className="mt-0.5 font-mono font-semibold">{insight.openInvoices}</div>
                </div>
              </div>
            </div>
          )}

          {runs.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-ink-900">Recent reminders</h2>
              <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
                {runs.slice(0, 5).map((r: typeof runs[number]) => (
                  <div key={r.id} className="text-xs flex items-start gap-1.5">
                    {r.channel === 'sms' ? <MessageSquare className="h-3 w-3 text-ink-500 mt-0.5" /> : <Mail className="h-3 w-3 text-ink-500 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1"><span className={`badge text-[9px] ${r.status === 'sent' ? 'badge-success' : 'badge-neutral'}`}>{r.status}</span><span className="text-ink-500">{r.sentAt ? formatDate(r.sentAt) : 'queued'}</span></div>
                      {r.subject && <div className="text-ink-700 truncate mt-0.5">{r.subject}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ icon, label, value, sub, danger }: { icon: React.ReactNode; label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-500 uppercase tracking-wider font-medium">{label}</div>
        <div className={danger ? 'text-red-500' : 'text-ink-400'}>{icon}</div>
      </div>
      <div className={`mt-2 text-2xl font-display font-bold ${danger ? 'text-red-600' : 'text-ink-950'}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
    </div>
  );
}
