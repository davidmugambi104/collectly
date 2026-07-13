import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect, notFound } from 'next/navigation';
import { db, schema } from '@/db';
import { invoices, customers, payments, dunningRuns, organizations } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { formatCurrency, formatDate, daysOverdue } from '@/lib/utils';
import { DunningSendPanel } from '@/components/dunning/send-panel';
import { MarkAsPaidButton } from '@/components/invoices/mark-paid-button';
import { ArrowLeft, MessageSquare, Mail, ExternalLink, Clock, CheckCircle2 } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import Link from 'next/link';
import { getCustomerInsights } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { userId, orgId } = await getAuth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');
  const { id } = await params;

  const [row] = await db
    .select({ invoice: invoices, customer: customers, org: organizations })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(organizations, eq(organizations.id, invoices.orgId))
    .where(eq(invoices.id, id))
    .limit(1);

  if (!row || row.invoice.orgId !== orgId) notFound();

  const { invoice, customer, org } = row;
  const balance = Number(invoice.amount) - Number(invoice.amountPaid);
  const days = daysOverdue(invoice.dueDate);
  const isOverdue = days > 0 && invoice.status !== 'paid';

  // Get customer insight for risk + AI recommendation
  const allInsights = await getCustomerInsights(orgId, 100);
  const insight = allInsights.find((c) => c.customerId === customer.id);

  const [runs, pays] = await Promise.all([
    db.select().from(dunningRuns).where(eq(dunningRuns.invoiceId, id)).orderBy(desc(dunningRuns.createdAt)).limit(20),
    db.select().from(payments).where(eq(payments.invoiceId, id)).orderBy(desc(payments.paidAt)).limit(20),
  ]);

  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3030'}/pay/${invoice.id}`;

  return (
    <AppShell title={`Invoice ${invoice.number}`} subtitle={`${customer.name} · ${formatCurrency(balance, invoice.currency)} ${isOverdue ? 'overdue' : 'open'}`}>
      <div className="mb-4">
        <Link href="/dashboard/invoices" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900">
          <ArrowLeft className="h-3.5 w-3.5" />All invoices
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Status / Balance card */}
          <div className="card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs text-ink-500 uppercase tracking-wider font-medium">Status</div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {invoice.status === 'paid' ? <span className="badge-success">Paid</span>
                    : isOverdue ? <span className="badge-danger">Overdue · {days}d</span>
                    : <span className="badge-warn capitalize">{invoice.status}</span>}
                  {invoice.lastReminderAt && <span className="text-xs text-ink-500">Last reminded {formatDate(invoice.lastReminderAt)}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-500">Balance</div>
                <div className="text-3xl font-display font-bold text-ink-950 font-mono">{formatCurrency(balance, invoice.currency)}</div>
                {Number(invoice.amountPaid) > 0 && <div className="text-xs text-ink-500 mt-0.5">of {formatCurrency(invoice.amount, invoice.currency)}</div>}
              </div>
            </div>

            {invoice.status !== 'paid' && (
              <div className="mt-4 pt-4 border-t border-ink-100 flex items-center gap-2 flex-wrap">
                <MarkAsPaidButton invoiceId={invoice.id} />
                <a href={portalUrl} target="_blank" rel="noopener" className="btn-secondary text-sm">
                  <ExternalLink className="h-3.5 w-3.5" />Customer pay portal
                </a>
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-ink-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><div className="text-xs text-ink-500">Issued</div><div className="font-medium">{formatDate(invoice.issueDate)}</div></div>
              <div><div className="text-xs text-ink-500">Due</div><div className="font-medium">{formatDate(invoice.dueDate)}</div></div>
              {invoice.paidAt && <div><div className="text-xs text-ink-500">Paid</div><div className="font-medium text-emerald-600">{formatDate(invoice.paidAt)}</div></div>}
              <div><div className="text-xs text-ink-500">Currency</div><div className="font-mono font-medium">{invoice.currency}</div></div>
            </div>

            {invoice.description && (
              <div className="mt-5 pt-5 border-t border-ink-100">
                <div className="text-xs text-ink-500">Description</div>
                <p className="mt-1 text-sm text-ink-700">{invoice.description}</p>
              </div>
            )}
          </div>

          <DunningSendPanel
            invoiceId={invoice.id}
            customerName={customer.name}
            amount={invoice.amount}
            currency={invoice.currency}
            daysOverdue={days}
            email={customer.email}
            phone={customer.phone}
            preferredChannel={customer.preferredChannel}
            riskLevel={insight?.riskLevel}
            riskScore={insight?.riskScore}
            recommendedAction={insight?.recommendedAction}
            recommendedChannel={insight?.recommendedChannel}
            predictedPayment7d={insight?.predictedPayment7d}
          />

          {runs.length > 0 && (
            <div className="card">
              <h2 className="h3">Communication history</h2>
              <p className="text-xs text-ink-500 mt-0.5">All reminders sent for this invoice.</p>
              <div className="mt-3 space-y-2">
                {runs.map((r: typeof runs[number]) => (
                  <div key={r.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-ink-100">
                    {r.channel === 'sms' ? <MessageSquare className="h-4 w-4 text-ink-500 mt-0.5" /> : <Mail className="h-4 w-4 text-ink-500 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge text-[10px] ${r.status === 'sent' || r.status === 'delivered' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-neutral'}`}>{r.status}</span>
                        <span className="text-xs text-ink-500">{r.sentAt ? new Date(r.sentAt).toLocaleString() : 'queued'}</span>
                      </div>
                      {r.subject && <div className="text-xs font-medium text-ink-800 mt-1 truncate">{r.subject}</div>}
                      <div className="text-xs text-ink-600 mt-0.5 line-clamp-2">{r.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pays.length > 0 && (
            <div className="card">
              <h2 className="h3">Payments</h2>
              <div className="mt-3 space-y-2">
                {pays.map((p: typeof pays[number]) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-ink-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="text-sm font-medium text-ink-900">{formatCurrency(p.amount, p.currency)} via {p.method ?? 'manual'}</div>
                        <div className="text-xs text-ink-500">{formatDate(p.paidAt)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-ink-900">Customer</h2>
            <div className="mt-3 space-y-1.5 text-sm">
              <Link href={`/dashboard/customers/${customer.id}`} className="block font-medium text-ink-900 hover:text-brand-600">{customer.name}</Link>
              {customer.company && <div className="text-xs text-ink-500">{customer.company}</div>}
              {customer.email && <div className="text-xs text-ink-700">{customer.email}</div>}
              {customer.phone && <div className="text-xs text-ink-700">{customer.phone}</div>}
            </div>
            <div className="mt-3 pt-3 border-t border-ink-100">
              <div className="text-xs text-ink-500">Risk score</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                  <div className={`h-full ${(customer.paymentBehavior?.riskScore ?? 0) > 60 ? 'bg-red-500' : (customer.paymentBehavior?.riskScore ?? 0) > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${customer.paymentBehavior?.riskScore ?? 0}%` }} />
                </div>
                <span className="text-xs font-mono text-ink-700">{customer.paymentBehavior?.riskScore ?? 0}</span>
              </div>
            </div>
            <Link href={`/dashboard/customers/${customer.id}`} className="mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1">
              View customer →
            </Link>
          </div>

          <div className="card">
            <h2 className="font-semibold text-ink-900">Payment portal link</h2>
            <p className="mt-1 text-xs text-ink-600">Send this to your customer to collect online.</p>
            <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50 p-2">
              <code className="text-xs font-mono break-all flex-1">{portalUrl}</code>
              <CopyButton text={portalUrl} />
            </div>
            <a href={portalUrl} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 font-medium">
              Open portal <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
