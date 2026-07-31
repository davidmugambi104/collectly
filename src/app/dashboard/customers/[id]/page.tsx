import { AppShell } from '@/components/app/shell';
import { db } from '@/db';
import { customers, invoices, payments, timelineEvents, promisesToPay, disputes } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthWithOrg as auth } from '@/lib/auth-helper';
import { redirect, notFound } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getCustomerInsights } from '@/lib/analytics';
import {
  Mail, MessageSquare, AlertCircle, CheckCircle2, Clock,
  FileText, DollarSign, Pause, Play, X, Bell, Phone, Sparkles, TrendingUp,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CustomerStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect('/sign-in');
  const orgId = session.orgId;
  const { id } = await params;

  // Fetch customer
  const customer = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.orgId, orgId)))
    .limit(1);

  if (customer.length === 0) notFound();

  const cust = customer[0];

  // Fetch all related data
  const [customerInvoices, customerPayments, customerTimeline, customerPromises, customerDisputes] = await Promise.all([
    db.select().from(invoices).where(eq(invoices.customerId, cust.id)).orderBy(desc(invoices.dueDate)),
    db.select().from(payments).where(eq(payments.customerId, cust.id)).orderBy(desc(payments.paidAt)).limit(20),
    db.select().from(timelineEvents).where(eq(timelineEvents.customerId, cust.id)).orderBy(desc(timelineEvents.occurredAt)).limit(100),
    db.select().from(promisesToPay).where(eq(promisesToPay.customerId, cust.id)).orderBy(desc(promisesToPay.createdAt)),
    db.select().from(disputes).where(eq(disputes.customerId, cust.id)).orderBy(desc(disputes.createdAt)),
  ]);

  // Calculate totals
  const totalOwed = customerInvoices.reduce((sum: number, inv: typeof invoices.$inferSelect) => {
    return sum + (parseFloat(inv.amount.toString()) - parseFloat(inv.amountPaid?.toString() || '0'));
  }, 0);

  const totalOverdue = customerInvoices
    .filter((inv: typeof invoices.$inferSelect) => new Date(inv.dueDate) < new Date() && inv.status !== 'paid' && inv.status !== 'written_off')
    .reduce((sum: number, inv: typeof invoices.$inferSelect) => sum + (parseFloat(inv.amount.toString()) - parseFloat(inv.amountPaid?.toString() || '0')), 0);

  const activePromiseCount = customerPromises.filter((p: typeof promisesToPay.$inferSelect) => p.status === 'active').length;
  const brokenPromiseCount = customerPromises.filter((p: typeof promisesToPay.$inferSelect) => p.status === 'broken').length;
  const openDisputeCount = customerDisputes.filter((d: typeof disputes.$inferSelect) => d.status === 'open' || d.status === 'in_progress').length;

  // Follow-up engine: pull the insight for this customer specifically.
  // getCustomerInsights returns a sorted list for the whole org; find ours.
  const allInsights = await getCustomerInsights(orgId, 200);
  const insight = allInsights.find((i) => i.customerId === cust.id) ?? null;

  return (
    <AppShell
      title={cust.name}
      subtitle={`Customer statement · ${cust.email || 'no email'}`}
    >
      {/* Hero summary */}
      <div className="grid lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total owed"
          value={formatCurrency(totalOwed)}
          accent={totalOwed > 0 ? 'amber' : 'gray'}
        />
        <SummaryCard
          icon={<Clock className="h-5 w-5" />}
          label="Overdue"
          value={formatCurrency(totalOverdue)}
          accent={totalOverdue > 0 ? 'red' : 'gray'}
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Active promises"
          value={activePromiseCount.toString()}
          accent={activePromiseCount > 0 ? 'emerald' : 'gray'}
        />
        <SummaryCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Open disputes"
          value={openDisputeCount.toString()}
          accent={openDisputeCount > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* AI follow-up engine — risk + recommended next action. Pulled from
          the same getCustomerInsights() the customers list uses, so the
          recommendation is consistent across both views. */}
      {insight ? (
        <FollowUpPanel insight={insight} />
      ) : totalOwed <= 0 ? (
        <div className="card mb-6 bg-emerald-50/30 border-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-ink-900">No open balance</div>
              <p className="text-sm text-ink-700 mt-0.5">This customer is paid up. No follow-up needed.</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Relationship trust indicators */}
      {(brokenPromiseCount > 0 || cust.paymentBehavior?.paidRate < 0.8) && (
        <div className="card border-amber-200 bg-amber-50/30 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-ink-900 mb-1">Relationship flags</div>
              <ul className="text-sm text-ink-700 space-y-1">
                {brokenPromiseCount > 0 && (
                  <li>· {brokenPromiseCount} broken promise{brokenPromiseCount === 1 ? '' : 's'} in history</li>
                )}
                {cust.paymentBehavior && cust.paymentBehavior.paidRate < 0.8 && (
                  <li>· Historical paid rate: {Math.round(cust.paymentBehavior.paidRate * 100)}%</li>
                )}
                {cust.paymentBehavior && cust.paymentBehavior.avgDaysToPay > 45 && (
                  <li>· Average {cust.paymentBehavior.avgDaysToPay} days to pay</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Active promises */}
      {customerPromises.filter((p: typeof promisesToPay.$inferSelect) => p.status === 'active').length > 0 && (
        <div className="card mb-6">
          <h2 className="h3 mb-4">Active promises to pay</h2>
          <div className="space-y-2">
            {customerPromises.filter((p: typeof promisesToPay.$inferSelect) => p.status === 'active').map((p: typeof promisesToPay.$inferSelect) => (
              <div key={p.id} className="flex items-center justify-between border border-emerald-200 bg-emerald-50/30 rounded-lg p-3">
                <div>
                  <div className="font-semibold text-ink-900">
                    {formatCurrency(parseFloat(p.promisedAmount.toString()))} by {formatDate(p.promisedDate)}
                  </div>
                  {p.sourceText && (
                    <div className="text-xs text-ink-600 mt-1 italic">"{p.sourceText}"</div>
                  )}
                </div>
                <span className="badge bg-emerald-100 text-emerald-700 border-emerald-200">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open disputes */}
      {customerDisputes.filter((d: typeof disputes.$inferSelect) => d.status === 'open' || d.status === 'in_progress').length > 0 && (
        <div className="card mb-6">
          <h2 className="h3 mb-4">Open disputes</h2>
          <div className="space-y-2">
            {customerDisputes.filter((d: typeof disputes.$inferSelect) => d.status === 'open' || d.status === 'in_progress').map((d: typeof disputes.$inferSelect) => (
              <div key={d.id} className="border border-red-200 bg-red-50/30 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-ink-900">
                      {d.reason.replace(/_/g, ' ')}
                    </div>
                    {d.customerMessage && (
                      <div className="text-sm text-ink-700 mt-1 italic">"{d.customerMessage}"</div>
                    )}
                    {d.internalNotes && (
                      <div className="text-xs text-ink-600 mt-2">Note: {d.internalNotes}</div>
                    )}
                  </div>
                  <span className="badge bg-red-100 text-red-700 border-red-200 whitespace-nowrap">
                    {d.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices */}
      <div className="card mb-6">
        <h2 className="h3 mb-4">All invoices ({customerInvoices.length})</h2>
        {customerInvoices.length === 0 ? (
          <p className="text-sm text-ink-500">No invoices yet</p>
        ) : (
          <div className="space-y-2">
            {customerInvoices.map((inv: typeof invoices.$inferSelect) => {
              const amount = parseFloat(inv.amount.toString());
              const paid = parseFloat(inv.amountPaid?.toString() || '0');
              const remaining = amount - paid;
              const isOverdue = new Date(inv.dueDate) < new Date() && inv.status !== 'paid';
              return (
                <div key={inv.id} className="flex items-center justify-between border border-ink-200 rounded-lg p-3">
                  <div className="flex-1">
                    <div className="font-medium text-ink-900">Invoice {inv.number}</div>
                    <div className="text-xs text-ink-500 mt-0.5">
                      Issued {formatDate(inv.issueDate)} · Due {formatDate(inv.dueDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold text-ink-900">{formatCurrency(remaining)}</div>
                    {amount > paid && (
                      <div className="text-xs text-ink-500">of {formatCurrency(amount)}</div>
                    )}
                    <span className={`badge mt-1 ${
                      inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      inv.status === 'disputed' ? 'bg-red-100 text-red-700' :
                      isOverdue ? 'bg-amber-100 text-amber-700' :
                      'bg-ink-100 text-ink-700'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity timeline */}
      <div className="card">
        <h2 className="h3 mb-4">Activity timeline</h2>
        {customerTimeline.length === 0 ? (
          <p className="text-sm text-ink-500">No activity recorded yet</p>
        ) : (
          <div className="space-y-3">
            {customerTimeline.map((event: typeof timelineEvents.$inferSelect) => (
              <TimelineRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: 'emerald' | 'amber' | 'red' | 'gray';
}) {
  const accentClasses = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-ink-100 text-ink-600',
  };
  return (
    <div className="card">
      <div className={`h-9 w-9 rounded-lg grid place-items-center mb-2 ${accentClasses[accent]}`}>
        {icon}
      </div>
      <div className="text-2xl font-display font-bold text-ink-950">{value}</div>
      <div className="text-xs text-ink-500 mt-0.5">{label}</div>
    </div>
  );
}

function TimelineRow({ event }: { event: typeof timelineEvents.$inferSelect }) {
  const iconMap: Record<string, React.ReactNode> = {
    invoice_created: <FileText className="h-4 w-4" />,
    invoice_sent: <Mail className="h-4 w-4" />,
    reminder_scheduled: <Bell className="h-4 w-4" />,
    reminder_sent: <Mail className="h-4 w-4" />,
    reminder_opened: <Mail className="h-4 w-4" />,
    reminder_clicked: <Mail className="h-4 w-4" />,
    customer_reply: <MessageSquare className="h-4 w-4" />,
    promise_made: <CheckCircle2 className="h-4 w-4" />,
    promise_fulfilled: <CheckCircle2 className="h-4 w-4" />,
    promise_broken: <AlertCircle className="h-4 w-4" />,
    dispute_opened: <AlertCircle className="h-4 w-4" />,
    dispute_resolved: <CheckCircle2 className="h-4 w-4" />,
    payment_received: <DollarSign className="h-4 w-4" />,
    payment_plan_created: <Clock className="h-4 w-4" />,
    manual_pause: <Pause className="h-4 w-4" />,
    manual_resume: <Play className="h-4 w-4" />,
    note_added: <FileText className="h-4 w-4" />,
  };

  const colorMap: Record<string, string> = {
    promise_fulfilled: 'text-emerald-600 bg-emerald-50',
    promise_made: 'text-emerald-600 bg-emerald-50',
    promise_broken: 'text-red-600 bg-red-50',
    dispute_opened: 'text-red-600 bg-red-50',
    payment_received: 'text-emerald-600 bg-emerald-50',
    dispute_resolved: 'text-emerald-600 bg-emerald-50',
  };

  return (
    <div className="flex items-start gap-3 pb-3 border-b border-ink-100 last:border-0">
      <div className={`h-8 w-8 rounded-lg grid place-items-center flex-shrink-0 ${
        colorMap[event.eventType] || 'text-ink-600 bg-ink-100'
      }`}>
        {iconMap[event.eventType] || <FileText className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-ink-900 text-sm">{event.title}</div>
        {event.description && (
          <div className="text-xs text-ink-600 mt-0.5">{event.description}</div>
        )}
      </div>
      <div className="text-xs text-ink-500 whitespace-nowrap">
        {formatDate(event.occurredAt)}
      </div>
    </div>
  );
}

/**
 * AI follow-up engine — risk + recommended next action for this customer.
 * Backed by the same getCustomerInsights() the customers list page uses, so
 * both views agree on risk level and recommended channel/tone.
 */
function FollowUpPanel({ insight }: { insight: import('@/lib/analytics').CustomerInsight }) {
  const riskPalette: Record<typeof insight.riskLevel, { bg: string; border: string; text: string; label: string }> = {
    low:      { bg: 'bg-emerald-50/40', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Low risk' },
    medium:   { bg: 'bg-amber-50/40',   border: 'border-amber-200',   text: 'text-amber-700',   label: 'Medium risk' },
    high:     { bg: 'bg-orange-50/40',  border: 'border-orange-200',  text: 'text-orange-700',  label: 'High risk' },
    critical: { bg: 'bg-red-50/40',     border: 'border-red-200',     text: 'text-red-700',     label: 'Critical risk' },
  };
  const pal = riskPalette[insight.riskLevel];
  const ChannelIcon =
    insight.recommendedChannel === 'phone' ? Phone :
    insight.recommendedChannel === 'sms'   ? MessageSquare : Mail;
  const predictedPct = Math.round(insight.predictedPayment7d * 100);

  return (
    <div className={`card mb-6 ${pal.bg} ${pal.border}`}>
      <div className="flex items-start gap-3 mb-4">
        <Sparkles className={`h-5 w-5 ${pal.text} mt-0.5 flex-shrink-0`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-ink-900">AI follow-up</span>
            <span className={`badge ${pal.bg} ${pal.text} border ${pal.border}`}>{pal.label} · {insight.riskScore}/100</span>
            <span className="badge bg-white text-ink-700 border-ink-200">
              <ChannelIcon className="h-3 w-3 mr-1" /> {insight.recommendedChannel}
            </span>
          </div>
          <p className="text-sm text-ink-800 mt-2 font-medium">{insight.recommendedAction}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 text-sm">
        <div className="bg-white/60 rounded-lg p-3">
          <div className="text-xs text-ink-500">Open balance</div>
          <div className="font-display font-bold text-ink-950 mt-0.5">{formatCurrency(insight.openBalance)}</div>
        </div>
        <div className="bg-white/60 rounded-lg p-3">
          <div className="text-xs text-ink-500">Oldest invoice</div>
          <div className="font-display font-bold text-ink-950 mt-0.5">{insight.oldestInvoiceDays}d ago</div>
        </div>
        <div className="bg-white/60 rounded-lg p-3">
          <div className="text-xs text-ink-500">Likely to pay in 7d</div>
          <div className="font-display font-bold text-ink-950 mt-0.5 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> {predictedPct}%
          </div>
        </div>
        <div className="bg-white/60 rounded-lg p-3">
          <div className="text-xs text-ink-500">Historical paid rate</div>
          <div className="font-display font-bold text-ink-950 mt-0.5">
            {Math.round(insight.paidRate * 100)}% · avg {insight.avgDaysToPay}d
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {insight.email && (
          <a
            href={`/dashboard/dunning?customerId=${insight.customerId}&tone=${insight.riskLevel === 'critical' ? 'final' : insight.riskLevel === 'high' ? 'firm' : 'friendly'}&channel=${insight.recommendedChannel === 'phone' ? 'email' : insight.recommendedChannel}`}
            className="btn-primary text-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Draft a {insight.riskLevel === 'critical' ? 'final' : insight.riskLevel === 'high' ? 'firm' : 'friendly'} message
          </a>
        )}
        <a href={`/dashboard/dunning/sequence`} className="btn-secondary text-sm">View dunning sequence</a>
        {insight.riskLevel === 'critical' && (
          <a href={`/dashboard/customers/${insight.customerId}/pause`} className="btn-secondary text-sm">Pause new work</a>
        )}
      </div>
    </div>
  );
}