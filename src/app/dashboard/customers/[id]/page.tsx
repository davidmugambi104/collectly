import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect, notFound } from 'next/navigation';
import { db, schema } from '@/db';
import { customers, invoices, payments, dunningRuns } from '@/db/schema';
import { eq, desc, sum, sql } from 'drizzle-orm';
import { formatCurrency, formatDate, daysOverdue } from '@/lib/utils';
import { ArrowLeft, Mail, Phone, MessageSquare, TrendingUp, AlertCircle, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { userId, orgId } = await getAuth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');
  const { id } = await params;

  const [cust] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!cust || cust.orgId !== orgId) notFound();

  const invs = await db.select().from(invoices).where(eq(invoices.customerId, id)).orderBy(desc(invoices.issueDate)).limit(50);
  const [{ outstanding }] = await db.select({ outstanding: sum(sql<string>`${invoices.amount} - ${invoices.amountPaid}`) }).from(invoices).where(sql`${invoices.customerId} = ${id} AND ${invoices.status} NOT IN ('paid', 'written_off')`);
  const [{ paid }] = await db.select({ paid: sum(payments.amount) }).from(payments).where(eq(payments.customerId, id));
  const [{ paidCount }] = await db.select({ paidCount: sql<number>`COUNT(*)::int` }).from(invoices).where(sql`${invoices.customerId} = ${id} AND ${invoices.status} = 'paid'`);
  const [{ totalCount }] = await db.select({ totalCount: sql<number>`COUNT(*)::int` }).from(invoices).where(eq(invoices.customerId, id));
  const runs = await db.select().from(dunningRuns).where(eq(dunningRuns.invoiceId, id)).orderBy(desc(dunningRuns.createdAt)).limit(20);

  const risk = cust.paymentBehavior?.riskScore ?? 0;
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
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Paid rate" value={`${paidRate}%`} />
        <Stat icon={<Clock className="h-4 w-4" />} label="Avg days to pay" value={`${avgDays}d`} />
      </div>

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
            </div>
            <div className="mt-3 pt-3 border-t border-ink-100 text-sm">
              <div className="text-xs text-ink-500">Preferred channel</div>
              <div className="mt-1 flex items-center gap-1.5 font-medium capitalize">
                {cust.preferredChannel === 'sms' ? <MessageSquare className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                {cust.preferredChannel}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-ink-900">Risk</h2>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                <div className={`h-full ${risk > 60 ? 'bg-red-500' : risk > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${risk}%` }} />
              </div>
              <span className="text-sm font-mono text-ink-700">{risk}</span>
            </div>
            <p className="mt-2 text-xs text-ink-600">{risk > 60 ? 'High risk. Prioritize collections.' : risk > 30 ? 'Moderate risk. Watch closely.' : 'Low risk. Good payer.'}</p>
          </div>

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
