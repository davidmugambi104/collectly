import { AppShell } from '@/components/app/shell';
import { db } from '@/db';
import { customers, invoices, payments, timelineEvents, promisesToPay, disputes } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthWithOrg as auth } from '@/lib/auth-helper';
import { redirect, notFound } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getCustomerInsights } from '@/lib/analytics';
import { PromisePanel } from '@/components/customers/promise-panel';
import { DisputePanel } from '@/components/customers/dispute-panel';
import { AddNoteForm } from '@/components/customers/add-note-form';
import {
  Mail, MessageSquare, AlertCircle, CheckCircle2, Clock,
  FileText, DollarSign, Pause, Play, Bell, Phone, Sparkles, TrendingUp,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

/* Row surface: the same light model as `.card`, one step quieter, for items in
   a list that sits directly on the canvas rather than inside a card. Composed
   from the depth variables so it stays in step if they are retuned. */
const ROW = 'relative border bg-white [border-color:var(--hair)] lift-1';
/* Empty state: an outline, not a surface. A solid card with "no invoices yet"
   in it claims the same weight as a card with content; a dashed edge reads as
   a slot waiting to be filled. Matches the promise and dispute panels. */
const EMPTY = 'rounded-[10px] border border-dashed border-ink-300/70 px-4 py-6 text-center';

/** Severity edge.
 *  `.row-urgent`/`.row-warn` express urgency as `border-left`, which works on a
 *  table row but is silently erased by any surface that declares the `border`
 *  shorthand — `.card`, `.card-primary`, or a list row with a hairline on all
 *  four sides all reset border-left-width back to 1px and recolour it. On those
 *  the edge has to be its own element to survive, so it is drawn as an inset
 *  pill: same 3px column of hue down the left, and it never fights the radius. */
function SeverityEdge({ tone }: { tone: 'danger' | 'warn' }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-r-full ${
        tone === 'danger' ? 'bg-danger-500' : 'bg-warn-500'
      }`}
    />
  );
}

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
  const [customerInvoices, , customerTimeline, customerPromises, customerDisputes] = await Promise.all([
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

  const eligibleInvoices = customerInvoices
    .filter((inv: typeof invoices.$inferSelect) => inv.status !== 'paid' && inv.status !== 'written_off')
    .map((inv: typeof invoices.$inferSelect) => ({ id: inv.id, number: inv.number, currency: inv.currency }));

  const activePromiseCount = customerPromises.filter((p: typeof promisesToPay.$inferSelect) => p.status === 'active').length;
  const brokenPromiseCount = customerPromises.filter((p: typeof promisesToPay.$inferSelect) => p.status === 'broken').length;
  const openDisputeCount = customerDisputes.filter((d: typeof disputes.$inferSelect) => d.status === 'open' || d.status === 'in_progress').length;

  // Follow-up engine: pull the insight for this customer specifically.
  // getCustomerInsights returns a sorted list for the whole org; find ours.
  const allInsights = await getCustomerInsights(orgId, 200);
  const insight = allInsights.find((i) => i.customerId === cust.id) ?? null;

  const hasFlags = brokenPromiseCount > 0 || cust.paymentBehavior?.paidRate < 0.8;
  // Share of the balance that is already late — the one ratio a collector reads
  // before deciding how hard to push.
  const overduePct = totalOwed > 0 ? Math.min(100, Math.round((totalOverdue / totalOwed) * 100)) : 0;

  return (
    <AppShell
      title={cust.name}
      subtitle={`Customer statement · ${cust.email || 'no email'}`}
    >
      {/* Two columns, not one stack. The left column is the working column —
          what to do, what is outstanding, what happened — and the right is
          reference: the numbers you check, never act on directly. The old
          layout gave a four-up tile row, an AI panel, a flags card, two action
          panels, an invoice card and a timeline all the same full width and the
          same visual weight, so nothing announced itself as the starting point. */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          {/* AI follow-up engine — risk + recommended next action. Pulled from
              the same getCustomerInsights() the customers list uses, so the
              recommendation is consistent across both views. */}
          {insight ? (
            <FollowUpPanel insight={insight} />
          ) : totalOwed <= 0 ? (
            <div className="card-primary">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="chip-icon h-9 w-9 rounded-full bg-success-50 text-success-600 ring-success-100">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <div className="app-heading">No open balance</div>
                  <p className="app-body mt-1">This customer is paid up. No follow-up needed.</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Promises to pay + disputes — panels handle both display and the
              create/act forms (log a promise, mark fulfilled/broken, open a
              dispute, resolve). Eligible invoices are anything not already
              paid or written off. */}
          <PromisePanel
            customerId={cust.id}
            invoices={eligibleInvoices}
            promises={customerPromises.map((p: typeof promisesToPay.$inferSelect) => ({
              id: p.id,
              invoiceId: p.invoiceId,
              promisedAmount: p.promisedAmount.toString(),
              promisedDate: p.promisedDate,
              currency: p.currency,
              status: p.status,
              sourceText: p.sourceText,
            }))}
          />

          <DisputePanel
            customerId={cust.id}
            invoices={eligibleInvoices}
            disputes={customerDisputes.map((d: typeof disputes.$inferSelect) => ({
              id: d.id,
              reason: d.reason,
              status: d.status,
              customerMessage: d.customerMessage,
              internalNotes: d.internalNotes,
            }))}
          />

          {/* Invoices. A list whose rows carry their own edge, so it sits on the
              canvas under a heading rather than inside a card — one box, not a
              box of boxes. */}
          <section className="section" aria-labelledby="invoices-heading">
            <div className="section-head">
              <div>
                <h2 id="invoices-heading" className="app-heading">All invoices</h2>
                <p className="app-meta mt-0.5 font-normal">Newest due date first.</p>
              </div>
              <span className="app-meta num">{customerInvoices.length}</span>
            </div>
            {customerInvoices.length === 0 ? (
              <p className={`app-body text-ink-500 ${EMPTY}`}>No invoices yet</p>
            ) : (
              <ul className="space-y-1.5">
                {customerInvoices.map((inv: typeof invoices.$inferSelect) => {
                  const amount = parseFloat(inv.amount.toString());
                  const paid = parseFloat(inv.amountPaid?.toString() || '0');
                  const remaining = amount - paid;
                  const isOverdue = new Date(inv.dueDate) < new Date() && inv.status !== 'paid';
                  // Severity as a left edge, matching the invoices table. It
                  // gives the list a scannable column of urgency without
                  // tinting whole rows.
                  const edge: 'danger' | 'warn' | null =
                    inv.status === 'disputed' ? 'danger' : isOverdue ? 'warn' : null;
                  const badge =
                    inv.status === 'paid' ? 'badge-success' :
                    inv.status === 'disputed' ? 'badge-danger' :
                    isOverdue ? 'badge-warn' : 'badge-neutral';
                  return (
                    <li
                      key={inv.id}
                      className={`flex items-center justify-between gap-4 rounded-[10px] px-3.5 py-3 ${ROW}`}
                    >
                      {edge && <SeverityEdge tone={edge} />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Mono is for identifiers only — this is one. */}
                          <span className="font-mono text-[13px] font-medium text-ink-900">{inv.number}</span>
                          <span className={`${badge} capitalize`}>{inv.status.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="app-meta mt-1 font-normal">
                          Issued {formatDate(inv.issueDate)} · Due {formatDate(inv.dueDate)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="num-strong text-[15px]">{formatCurrency(remaining)}</div>
                        {amount > paid && paid > 0 && (
                          <div className="app-meta mt-0.5 font-normal">of <span className="num">{formatCurrency(amount)}</span></div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Activity timeline */}
          <section className="section" aria-labelledby="timeline-heading">
            <div className="section-head">
              <div>
                <h2 id="timeline-heading" className="app-heading">Activity timeline</h2>
                <p className="app-meta mt-0.5 font-normal">Most recent first.</p>
              </div>
              <AddNoteForm customerId={cust.id} />
            </div>
            {customerTimeline.length === 0 ? (
              <p className="app-body text-ink-500">No activity recorded yet</p>
            ) : (
              <Timeline events={customerTimeline} />
            )}
          </section>
        </div>

        {/* Reference rail. */}
        <aside className="min-w-0 space-y-4">
          {/* One summary surface with a hierarchy instead of four identical
              tiles. The balance is the figure; overdue qualifies it; promises
              and disputes are counts, so they read as rows, not as headlines. */}
          <div className="card">
            <h2 className="app-heading">Account summary</h2>

            <div className="mt-3">
              <div className="app-meta">Total owed</div>
              <div className="num-strong mt-1 text-[28px] leading-none tracking-[-0.02em]">
                {formatCurrency(totalOwed)}
              </div>
            </div>

            {totalOwed > 0 && (
              <div className="mt-3">
                {/* The bar is the same length for every customer, so the filled
                    share is directly comparable across the book. */}
                <div
                  className="meter h-1.5"
                  role="meter"
                  aria-valuenow={overduePct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Share of balance overdue"
                >
                  <div
                    className={totalOverdue > 0 ? 'bg-danger-500' : 'bg-success-500'}
                    style={{ width: `${totalOverdue > 0 ? Math.max(4, overduePct) : 100}%` }}
                  />
                </div>
                <p className="app-meta mt-1.5 font-normal">
                  {totalOverdue > 0
                    ? <><span className="num">{formatCurrency(totalOverdue)}</span> overdue · {overduePct}% of balance</>
                    : 'Nothing overdue'}
                </p>
              </div>
            )}

            <dl className="mt-4 border-t border-ink-100">
              <SummaryRow label="Overdue" value={formatCurrency(totalOverdue)} tone={totalOverdue > 0 ? 'danger' : 'none'} />
              <SummaryRow label="Active promises" value={activePromiseCount.toString()} tone={activePromiseCount > 0 ? 'success' : 'none'} />
              <SummaryRow label="Open disputes" value={openDisputeCount.toString()} tone={openDisputeCount > 0 ? 'danger' : 'none'} />
            </dl>
          </div>

          {/* Contact block: the channel details you need mid-call, not buried in
              the page subtitle. */}
          {(cust.email || cust.phone || cust.company) && (
            <div className="card">
              <h2 className="app-heading">Contact</h2>
              <div className="mt-3 space-y-2">
                {cust.company && (
                  <div className="app-body flex items-center gap-2">
                    <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                    <span className="truncate">{cust.company}</span>
                  </div>
                )}
                {cust.email && (
                  <div className="app-body flex items-center gap-2">
                    <Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                )}
                {cust.phone && (
                  <div className="app-body flex items-center gap-2">
                    <Phone aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                    <span className="num truncate">{cust.phone}</span>
                  </div>
                )}
              </div>
              <div className="app-meta mt-3 border-t border-ink-100 pt-3 font-normal capitalize">
                Prefers {cust.preferredChannel}
              </div>
            </div>
          )}

          {/* Relationship trust indicators. Severity as a left edge rather than
              a tinted card: this is context for a judgement call, not an alarm. */}
          {hasFlags && (
            <div className="card relative">
              <SeverityEdge tone="warn" />
              <div className="flex items-start gap-2.5">
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0 text-warn-600" />
                <div className="min-w-0">
                  <div className="app-label">Relationship flags</div>
                  <ul className="mt-2 space-y-1.5">
                    {brokenPromiseCount > 0 && (
                      <FlagItem>{brokenPromiseCount} broken promise{brokenPromiseCount === 1 ? '' : 's'} in history</FlagItem>
                    )}
                    {cust.paymentBehavior && cust.paymentBehavior.paidRate < 0.8 && (
                      <FlagItem>Historical paid rate: {Math.round(cust.paymentBehavior.paidRate * 100)}%</FlagItem>
                    )}
                    {cust.paymentBehavior && cust.paymentBehavior.avgDaysToPay > 45 && (
                      <FlagItem>Average {cust.paymentBehavior.avgDaysToPay} days to pay</FlagItem>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

/** A label/value row in the rail summary. The severity dot is the badge
 *  system's vocabulary at row scale: ~8px² of hue, never a tinted row. */
function SummaryRow({ label, value, tone }: { label: string; value: string; tone: 'danger' | 'success' | 'none' }) {
  const dot = tone === 'danger' ? 'bg-danger-500' : tone === 'success' ? 'bg-success-500' : 'bg-ink-300';
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-100 py-2.5 last:border-b-0">
      <dt className="app-body flex items-center gap-2 text-ink-600">
        <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        {label}
      </dt>
      <dd className={`num-strong text-[13px] ${tone === 'danger' ? 'text-danger-700' : ''}`}>{value}</dd>
    </div>
  );
}

function FlagItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="app-body flex gap-2">
      <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warn-500" />
      <span>{children}</span>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline.
   Previously a stack of paragraphs, each with its own bordered icon tile and a
   repeated full date on the right — a list, not a chronology. What makes a feed
   read as time passing is a single continuous spine with dated nodes on it, so:
   events are grouped under the day they happened (the date is stated once, as a
   node on the line), the connector runs unbroken behind the markers, and each
   event keeps only its clock time. */

function timeOf(d: Date | string | null | undefined) {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return {
    label: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date),
    // Machine-readable, so <time> is a real timestamp and not styled text.
    iso: date.toISOString(),
  };
}

function Timeline({ events }: { events: (typeof timelineEvents.$inferSelect)[] }) {
  // Events arrive sorted newest-first, so consecutive runs of the same day are
  // already contiguous — no sorting or extra passes needed.
  const groups: { label: string; items: (typeof timelineEvents.$inferSelect)[] }[] = [];
  for (const event of events) {
    const label = formatDate(event.occurredAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(event);
    else groups.push({ label, items: [event] });
  }

  return (
    <div className="relative">
      {/* The spine. Markers are opaque and the day dots carry a canvas-coloured
          ring, so both punch through it cleanly. */}
      <span aria-hidden="true" className="absolute bottom-3 left-[13.5px] top-3 w-px bg-ink-200" />
      <ol className="relative space-y-1">
        {groups.map((group) => (
          <li key={group.label}>
            <h3 className="relative flex items-center py-2 pl-10">
              <span aria-hidden="true" className="absolute left-[9px] h-2.5 w-2.5 rounded-full bg-ink-300 ring-4 ring-ink-50" />
              <span className="app-meta">{group.label}</span>
            </h3>
            <ol className="space-y-3 pb-2">
              {group.items.map((event) => (
                <TimelineRow key={event.id} event={event} />
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TimelineRow({ event }: { event: typeof timelineEvents.$inferSelect }) {
  const iconMap: Record<string, React.ReactNode> = {
    invoice_created: <FileText className="h-3.5 w-3.5" />,
    invoice_sent: <Mail className="h-3.5 w-3.5" />,
    reminder_scheduled: <Bell className="h-3.5 w-3.5" />,
    reminder_sent: <Mail className="h-3.5 w-3.5" />,
    reminder_opened: <Mail className="h-3.5 w-3.5" />,
    reminder_clicked: <Mail className="h-3.5 w-3.5" />,
    customer_reply: <MessageSquare className="h-3.5 w-3.5" />,
    promise_made: <CheckCircle2 className="h-3.5 w-3.5" />,
    promise_fulfilled: <CheckCircle2 className="h-3.5 w-3.5" />,
    promise_broken: <AlertCircle className="h-3.5 w-3.5" />,
    dispute_opened: <AlertCircle className="h-3.5 w-3.5" />,
    dispute_resolved: <CheckCircle2 className="h-3.5 w-3.5" />,
    payment_received: <DollarSign className="h-3.5 w-3.5" />,
    payment_plan_created: <Clock className="h-3.5 w-3.5" />,
    manual_pause: <Pause className="h-3.5 w-3.5" />,
    manual_resume: <Play className="h-3.5 w-3.5" />,
    note_added: <FileText className="h-3.5 w-3.5" />,
  };

  // Hue lives in the marker's ring and glyph only — the event text stays black
  // on the canvas, so a run of green nodes never becomes a wall of colour.
  const colorMap: Record<string, string> = {
    promise_fulfilled: 'text-success-600 bg-success-50 ring-success-200',
    promise_made: 'text-success-600 bg-success-50 ring-success-200',
    promise_broken: 'text-danger-600 bg-danger-50 ring-danger-200',
    dispute_opened: 'text-danger-600 bg-danger-50 ring-danger-200',
    payment_received: 'text-success-600 bg-success-50 ring-success-200',
    dispute_resolved: 'text-success-600 bg-success-50 ring-success-200',
  };

  const time = timeOf(event.occurredAt);

  return (
    <li className="relative flex gap-3">
      <span
        aria-hidden="true"
        className={`chip-icon relative z-10 h-7 w-7 rounded-full ${
          colorMap[event.eventType] || 'text-ink-500'
        }`}
      >
        {iconMap[event.eventType] || <FileText className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="app-label">{event.title}</div>
          {time && (
            <time dateTime={time.iso} className="app-meta shrink-0 font-normal tabular-nums">{time.label}</time>
          )}
        </div>
        {event.description && (
          <div className="app-body mt-0.5 text-ink-600">{event.description}</div>
        )}
      </div>
    </li>
  );
}

/**
 * AI follow-up engine — risk + recommended next action for this customer.
 * Backed by the same getCustomerInsights() the customers list page uses, so
 * both views agree on risk level and recommended channel/tone.
 */
function FollowUpPanel({ insight }: { insight: import('@/lib/analytics').CustomerInsight }) {
  // Hue now rides the badge and the icon, not a wash over the whole panel —
  // and `high` was on raw orange-*, which has no token behind it at all.
  const riskPalette: Record<
    typeof insight.riskLevel,
    { badge: string; text: string; label: string; edge: 'danger' | 'warn' | null }
  > = {
    low:      { badge: 'badge-success', text: 'text-success-600', label: 'Low risk',      edge: null },
    medium:   { badge: 'badge-warn',    text: 'text-warn-600',    label: 'Medium risk',   edge: null },
    high:     { badge: 'badge-warn',    text: 'text-warn-700',    label: 'High risk',     edge: 'warn' },
    critical: { badge: 'badge-danger',  text: 'text-danger-600',  label: 'Critical risk', edge: 'danger' },
  };
  const pal = riskPalette[insight.riskLevel];
  const ChannelIcon =
    insight.recommendedChannel === 'phone' ? Phone :
    insight.recommendedChannel === 'sms'   ? MessageSquare : Mail;
  const predictedPct = Math.round(insight.predictedPayment7d * 100);

  return (
    // The surface this page is organised around: what to do about this
    // customer, right now. Neutral ground, severity carried by the left edge
    // and the badge dot.
    <div className="card-primary">
      {pal.edge && <SeverityEdge tone={pal.edge} />}
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="chip-icon mt-0.5 h-8 w-8 rounded-full bg-brand-50 ring-brand-100">
          <Sparkles className={`h-4 w-4 ${pal.text}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-meta">AI follow-up</span>
            <span className={pal.badge}>{pal.label} · {insight.riskScore}/100</span>
            <span className="badge-neutral capitalize">
              <ChannelIcon aria-hidden="true" className="h-3 w-3" /> {insight.recommendedChannel}
            </span>
          </div>
          {/* The recommendation is the whole point of the panel, so it is set
              as the sentence you read, not as caption text under a heading. */}
          <p className="mt-2 text-[15px] font-medium leading-6 tracking-[-0.01em] text-ink-950">
            {insight.recommendedAction}
          </p>
        </div>
      </div>

      {/* The evidence behind the recommendation, on a recessed shelf: same
          pattern as the invoice hero, so both detail screens read as one
          system. Four white-on-white boxes inside a white card read as nothing
          at all. */}
      <dl className="-mx-5 mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-ink-200/70 bg-ink-50/70 px-5 py-4 sm:grid-cols-4">
        <div>
          <dt className="app-meta">Open balance</dt>
          <dd className="num-strong mt-0.5 text-[15px]">{formatCurrency(insight.openBalance)}</dd>
        </div>
        <div>
          <dt className="app-meta">Oldest invoice</dt>
          <dd className="num-strong mt-0.5 text-[15px]">{insight.oldestInvoiceDays}d ago</dd>
        </div>
        <div>
          <dt className="app-meta">Likely to pay in 7d</dt>
          <dd className="num-strong mt-0.5 flex items-center gap-1 text-[15px]">
            <TrendingUp aria-hidden="true" className="h-3.5 w-3.5 text-ink-400" /> {predictedPct}%
          </dd>
        </div>
        <div>
          <dt className="app-meta">Historical paid rate</dt>
          <dd className="num-strong mt-0.5 text-[15px]">
            {Math.round(insight.paidRate * 100)}% · avg {insight.avgDaysToPay}d
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {insight.email && (
          <a
            href={`/dashboard/dunning?customerId=${insight.customerId}&tone=${insight.riskLevel === 'critical' ? 'final' : insight.riskLevel === 'high' ? 'firm' : 'friendly'}&channel=${insight.recommendedChannel === 'phone' ? 'email' : insight.recommendedChannel}`}
            className="btn-primary"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Draft a {insight.riskLevel === 'critical' ? 'final' : insight.riskLevel === 'high' ? 'firm' : 'friendly'} message
          </a>
        )}
        <a href={`/dashboard/dunning/sequence`} className="btn-ghost">View dunning sequence</a>
      </div>
    </div>
  );
}
