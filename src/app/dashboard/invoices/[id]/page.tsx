import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/db';
import { invoices, customers, payments, dunningRuns, organizations } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { formatCurrency, formatDate, daysOverdue } from '@/lib/utils';
import { DunningSendPanel } from '@/components/dunning/send-panel';
import { MarkAsPaidButton } from '@/components/invoices/mark-paid-button';
import { WriteOffButton } from '@/components/invoices/write-off-button';
import { ArrowLeft, MessageSquare, Mail, ExternalLink, CheckCircle2, Phone, Building2 } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import Link from 'next/link';
import { getCustomerInsights } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

/* Local surface recipes.
   `.card`/`.panel` are page-level surfaces; a list row wants the same light
   model at the quietest step (`.lift-1` plus a hairline), and a read-only value
   you copy out wants the recessed treatment `.input` has. The second has no
   token yet, so it is composed from the depth variables rather than invented. */
const ROW = 'border bg-white [border-color:var(--hair)] lift-1';
const WELL = 'rounded-lg border bg-ink-50 [border-color:var(--hair)] [box-shadow:inset_0_1px_2px_0_rgb(var(--shade)/0.05)]';

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

  const { invoice, customer } = row;
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

  const total = Number(invoice.amount);
  const paid = Number(invoice.amountPaid);
  // Part-paid invoices are the case where a single figure lies: "$4,000 due" on
  // a $10,000 invoice reads as a small debt until you know the denominator.
  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const isSettled = invoice.status === 'paid' || invoice.status === 'written_off';

  const riskScore = customer.paymentBehavior?.riskScore ?? 0;
  const risk =
    riskScore > 60 ? { bar: 'bg-danger-500', label: 'High' } :
    riskScore > 30 ? { bar: 'bg-warn-500', label: 'Medium' } :
    { bar: 'bg-success-500', label: 'Low' };

  return (
    <AppShell title={`Invoice ${invoice.number}`} subtitle={`${customer.name} · ${formatCurrency(balance, invoice.currency)} ${isOverdue ? 'overdue' : 'open'}`}>
      {/* Where am I. A back link plus the record's own identifier, so the page
          announces its place in the list rather than starting cold. */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2">
        <Link href="/dashboard/invoices" className="link-quiet">
          <ArrowLeft className="h-3.5 w-3.5" />All invoices
        </Link>
        <span aria-hidden="true" className="text-ink-300">/</span>
        <span className="font-mono text-[13px] text-ink-500">{invoice.number}</span>
      </nav>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Status / Balance — the surface this page is organised around.
              One focal figure (what is owed), the state that qualifies it, and
              the actions that resolve it. Everything else on the page is
              supporting detail and sits at a lower tier. */}
          <div className="card-primary">
            <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {invoice.status === 'paid' ? <span className="badge-success">Paid</span>
                    : invoice.status === 'written_off' ? <span className="badge-neutral">Written off</span>
                    : isOverdue ? <span className="badge-danger">Overdue · {days}d</span>
                    /* Mirrors StatusBadge in components/dashboard/invoices-table.tsx:
                       a stored status of 'overdue' on an invoice that is not
                       actually past due is stale sync data, so show the neutral
                       open-invoice label instead of echoing it. Without this the
                       same invoice read "Sent" in the list and "Overdue" here.
                       Neutral rather than badge-warn, so amber keeps meaning
                       "needs attention" consistently across both views. */
                    : invoice.status === 'overdue' ? <span className="badge-neutral">Sent</span>
                    : <span className="badge-neutral capitalize">{invoice.status.replace(/_/g, ' ')}</span>}
                  {invoice.lastReminderAt && (
                    <span className="app-meta font-normal">Last reminded {formatDate(invoice.lastReminderAt)}</span>
                  )}
                </div>

                <div className="app-meta mt-4">{isSettled ? 'Invoice total' : 'Balance due'}</div>
                {/* Money is tabular, never mono — `num-strong` aligns the places
                    without dropping a second typeface into the page. */}
                <div className="num-strong mt-1 text-[34px] leading-none tracking-[-0.025em]">
                  {formatCurrency(isSettled ? total : balance, invoice.currency)}
                </div>

                {paid > 0 && !isSettled && (
                  <div className="mt-3 max-w-[260px]">
                    <div
                      className="meter h-1.5"
                      role="meter"
                      aria-valuenow={paidPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Share of the invoice collected"
                    >
                      <div className="bg-success-500" style={{ width: `${paidPct}%` }} />
                    </div>
                    <p className="app-meta mt-1.5 font-normal">
                      <span className="num">{formatCurrency(paid, invoice.currency)}</span> of{' '}
                      <span className="num">{formatCurrency(total, invoice.currency)}</span> collected · {paidPct}%
                    </p>
                  </div>
                )}
              </div>

              {/* Actions sit level with the figure they resolve, top-right:
                  the shortest travel from where the eye lands. Constructive
                  actions group left, the irreversible one is separated. */}
              {!isSettled && (
                <div className="flex flex-wrap items-center gap-2">
                  <MarkAsPaidButton invoiceId={invoice.id} />
                  <a href={portalUrl} target="_blank" rel="noopener" className="btn-secondary">
                    <ExternalLink className="h-4 w-4" />Pay portal
                  </a>
                  <span aria-hidden="true" className="hidden h-6 w-px bg-ink-200 sm:block" />
                  <WriteOffButton invoiceId={invoice.id} />
                </div>
              )}
            </div>

            {invoice.description && (
              <div className="mt-5 border-t border-ink-100 pt-4">
                <div className="app-meta">Description</div>
                <p className="app-body mt-1">{invoice.description}</p>
              </div>
            )}

            {/* Dates and currency are reference data, not the headline. Dropping
                them into a recessed strip along the card's foot keeps them one
                glance away without competing with the balance. */}
            <dl className="-mx-5 -mb-5 mt-5 grid grid-cols-2 gap-x-6 gap-y-3 rounded-b-[14px] border-t border-ink-200/70 bg-ink-50/70 px-5 py-4 sm:grid-cols-4">
              <div>
                <dt className="app-meta">Issued</dt>
                <dd className="app-body mt-0.5 num-strong">{formatDate(invoice.issueDate)}</dd>
              </div>
              <div>
                <dt className="app-meta">Due</dt>
                <dd className={`app-body mt-0.5 num-strong ${isOverdue ? 'text-danger-700' : ''}`}>
                  {formatDate(invoice.dueDate)}
                </dd>
              </div>
              {invoice.paidAt ? (
                <div>
                  <dt className="app-meta">Paid</dt>
                  <dd className="app-body num-strong mt-0.5 text-success-700">{formatDate(invoice.paidAt)}</dd>
                </div>
              ) : (
                <div>
                  <dt className="app-meta">Age</dt>
                  <dd className="app-body num-strong mt-0.5">{days > 0 ? `${days}d past due` : 'Not yet due'}</dd>
                </div>
              )}
              <div>
                <dt className="app-meta">Currency</dt>
                <dd className="app-body mt-0.5 font-medium tracking-wide text-ink-900">{invoice.currency}</dd>
              </div>
            </dl>

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

          {pays.length > 0 && (
            // Money in comes before messages out: a payment changes what you do
            // next, a sent reminder only records that you did something.
            <section className="section" aria-labelledby="payments-heading">
              <div className="section-head">
                <div>
                  <h2 id="payments-heading" className="app-heading">Payments</h2>
                  <p className="app-meta mt-0.5 font-normal">Received against this invoice.</p>
                </div>
                <span className="app-meta num">{formatCurrency(paid, invoice.currency)} total</span>
              </div>
              <ul className="space-y-1.5">
                {pays.map((p: typeof pays[number]) => (
                  <li key={p.id} className={`flex items-center justify-between gap-3 rounded-[10px] px-3.5 py-2.5 ${ROW}`}>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-success-600" />
                      <div className="min-w-0">
                        <div className="app-label num-strong">{formatCurrency(p.amount, p.currency)}</div>
                        <div className="app-meta mt-0.5 font-normal capitalize">via {p.method ?? 'manual'}</div>
                      </div>
                    </div>
                    <div className="app-meta shrink-0 font-normal">{formatDate(p.paidAt)}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {runs.length > 0 && (
            <section className="section" aria-labelledby="comms-heading">
              <div className="section-head">
                <div>
                  <h2 id="comms-heading" className="app-heading">Communication history</h2>
                  <p className="app-meta mt-0.5 font-normal">All reminders sent for this invoice.</p>
                </div>
                <span className="app-meta num">{runs.length}</span>
              </div>
              {/* One surface with divided rows, not a bordered row inside a
                  bordered card. The channel glyph is the row's anchor, so the
                  list can be scanned for "did we ever text them" in one pass. */}
              <ul className="panel divide-y divide-ink-100">
                {runs.map((r: typeof runs[number]) => (
                  <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                    {/* `.chip-icon` seats the glyph in a recessed well — an icon
                        sitting loose on white reads as clip-art. */}
                    <span aria-hidden="true" className="chip-icon mt-0.5 h-7 w-7 rounded-full text-ink-500">
                      {r.channel === 'sms' ? <MessageSquare className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={r.status === 'sent' || r.status === 'delivered' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-neutral'}>{r.status}</span>
                        <span className="app-meta font-normal">{r.sentAt ? new Date(r.sentAt).toLocaleString() : 'queued'}</span>
                      </div>
                      {r.subject && <div className="app-label mt-1.5 truncate">{r.subject}</div>}
                      <div className="app-body mt-0.5 line-clamp-2 text-ink-600">{r.body}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Supporting rail: who this is, and how to get paid. Never the focal
            point, so both cards stay at `.card` weight. */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="app-heading">Customer</h2>
            <div className="mt-3 flex items-start gap-3">
              {/* A monogram gives the record a face; at a glance it is what
                  tells you which customer you are looking at. */}
              <span
                aria-hidden="true"
                className="chip-icon h-9 w-9 rounded-full bg-brand-50 text-[13px] font-semibold text-brand-700 ring-brand-100"
              >
                {customer.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <Link href={`/dashboard/customers/${customer.id}`} className="app-label block truncate hover:text-brand-700">
                  {customer.name}
                </Link>
                {customer.company && (
                  <div className="app-meta mt-0.5 flex items-center gap-1.5 font-normal">
                    <Building2 aria-hidden="true" className="h-3 w-3 shrink-0" />
                    <span className="truncate">{customer.company}</span>
                  </div>
                )}
              </div>
            </div>

            {(customer.email || customer.phone) && (
              <div className="mt-3 space-y-1.5 border-t border-ink-100 pt-3">
                {customer.email && (
                  <div className="app-body flex items-center gap-2">
                    <Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="app-body flex items-center gap-2">
                    <Phone aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                    <span className="num truncate">{customer.phone}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 border-t border-ink-100 pt-3">
              <div className="flex items-baseline justify-between">
                <span className="app-meta">Risk score</span>
                {/* The number alone means nothing to someone who has not read
                    the scoring rules; the word is what they act on. */}
                <span className="app-meta font-normal text-ink-700">
                  {risk.label} · <span className="num">{riskScore}</span>/100
                </span>
              </div>
              <div
                className="meter mt-1.5 h-1.5"
                role="meter"
                aria-valuenow={riskScore}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Customer risk score"
              >
                <div className={risk.bar} style={{ width: `${riskScore}%` }} />
              </div>
            </div>

            <Link href={`/dashboard/customers/${customer.id}`} className="link-quiet mt-3">
              View customer →
            </Link>
          </div>

          <div className="card">
            <h2 className="app-heading">Payment portal link</h2>
            <p className="app-body mt-1 text-ink-600">Send this to your customer to collect online.</p>
            {/* Recessed like an input: the URL is a value you take away, not a
                control, so it reads as a field without pretending to be one. */}
            <div className={`mt-3 flex items-center gap-1.5 p-2 ${WELL}`}>
              <code className="flex-1 break-all font-mono text-2xs text-ink-700">{portalUrl}</code>
              <CopyButton text={portalUrl} />
            </div>
            <a href={portalUrl} target="_blank" rel="noopener" className="link-quiet mt-2">
              Open portal <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
