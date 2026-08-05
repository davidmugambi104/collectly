export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { dunningSequences, dunningRuns, invoices, customers } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { nanoid, daysOverdue, formatCurrency } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { Sparkles, Mail, MessageSquare, Pause, Play, BarChart3, AlertCircle, ArrowLeft, ShieldAlert, TrendingUp, Send, Target, ChevronRight } from 'lucide-react';
import { DunningPreview } from '@/components/dunning/preview';
import { SequenceEditor } from '@/components/dunning/sequence-editor';
import { DunningTour, ReplayTourButton } from '@/components/dunning/tour';
import { DunningStuckHelper } from '@/components/dunning/stuck-helper';

const DEFAULT_STEPS = [
  { id: 's1', daysFromDue: 1, channel: 'email', tone: 'friendly', subject: 'Quick reminder — Invoice {{number}}', template: 'Hi {{contact_name}}, just a quick nudge that Invoice {{number}} for {{amount}} was due on {{due_date}}. You can settle it here: {{payment_link}}' },
  { id: 's2', daysFromDue: 7, channel: 'email', tone: 'firm', subject: 'Invoice {{number}} is now 7 days past due', template: 'Hi {{contact_name}}, Invoice {{number}} for {{amount}} is now 7 days past due. Please review and settle at your earliest convenience: {{payment_link}}' },
  { id: 's3', daysFromDue: 14, channel: 'email', tone: 'firm', subject: 'Action required: Invoice {{number}}', template: 'Hi {{contact_name}}, our records show Invoice {{number}} for {{amount}} is 14 days overdue. Please confirm payment status or settle the balance: {{payment_link}}' },
  { id: 's4', daysFromDue: 30, channel: 'sms', tone: 'final', subject: undefined as any, template: 'Final notice: Invoice {{number}} for {{amount}} is 30+ days overdue. Please reply or settle: {{payment_link}}' },
];

type Tone = 'friendly' | 'firm' | 'final';
type Channel = 'email' | 'sms';

function normalizeTone(raw: string | undefined, fallback: Tone = 'firm'): Tone {
  return raw === 'friendly' || raw === 'firm' || raw === 'final' ? raw : fallback;
}
function normalizeChannel(raw: string | undefined, fallback: Channel = 'email'): Channel {
  return raw === 'email' || raw === 'sms' ? raw : fallback;
}

export default async function DunningPage({ searchParams }: { searchParams: Promise<{ customerId?: string; tone?: string; channel?: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const sp = await searchParams;
  const targetCustomerId = sp.customerId;
  const targetTone = normalizeTone(sp.tone, 'firm');
  const targetChannel = normalizeChannel(sp.channel, 'email');

  // Pre-fill composer: when a customer id is in the URL, fetch their oldest
  // unpaid invoice so the operator can hit the dunning page from a per-customer
  // follow-up recommendation and immediately send (or revise) a message.
  let composer: {
    invoiceId: string;
    customerName: string;
    amount: string;
    currency: string;
    daysOverdue: number;
    email: string | null;
    phone: string | null;
  } | null = null;
  let composerError: string | null = null;

  if (targetCustomerId) {
    const [inv] = await db
      .select({ invoice: invoices, customer: customers })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(and(
        eq(invoices.orgId, orgId),
        eq(invoices.customerId, targetCustomerId),
        sql`${invoices.status} NOT IN ('paid', 'written_off')`,
      ))
      .orderBy(desc(invoices.dueDate))
      .limit(1);

    if (!inv) {
      composerError = 'No open invoices for this customer — nothing to chase.';
    } else if (targetChannel === 'email' && !inv.customer.email) {
      composerError = 'This customer has no email on file. Switch channel to SMS or add an email in their profile.';
    } else if (targetChannel === 'sms' && !inv.customer.phone) {
      composerError = 'This customer has no phone on file. Switch channel to email or add a phone in their profile.';
    } else {
      const remaining = (parseFloat(inv.invoice.amount.toString()) - parseFloat((inv.invoice.amountPaid ?? 0).toString())).toFixed(2);
      composer = {
        invoiceId: inv.invoice.id,
        customerName: inv.customer.name,
        amount: remaining,
        currency: inv.invoice.currency ?? 'USD',
        daysOverdue: Math.max(0, daysOverdue(inv.invoice.dueDate)),
        email: inv.customer.email,
        phone: inv.customer.phone,
      };
    }
  }

  let [seq] = await db.select().from(dunningSequences).where(eq(dunningSequences.orgId, orgId)).limit(1);
  if (!seq) {
    // First-time setup: create the default sequence and use the returned row
    // directly. Previously this didn't capture the insert, leaving `seq`
    // undefined until a future request -- harmless when this page only read
    // seq?.steps for a static display, but SequenceEditor needs a real
    // sequenceId to save against on the very first render, not next time.
    [seq] = await db.insert(dunningSequences).values({
      id: nanoid(), orgId, name: 'Default', isActive: true, steps: DEFAULT_STEPS as any, pauseOnReply: true, pauseOnPayment: true,
    }).returning();
  }

  const recentRuns = await db
    .select({
      run: dunningRuns,
      customerId: customers.id,
      customerName: customers.name,
      invoiceNumber: invoices.number,
    })
    .from(dunningRuns)
    .innerJoin(invoices, eq(invoices.id, dunningRuns.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(eq(dunningRuns.orgId, orgId))
    .orderBy(desc(dunningRuns.createdAt))
    .limit(20);

  const active = seq?.isActive ?? true;

  // Impact strip: the numbers that make dunning feel like it's working (or
  // like it needs attention), computed once so the page opens with "here's
  // what's at stake and what this has already recovered" instead of a bare
  // sequence editor.
  const [[riskRow], [recoveredRow], [sentRow], [dunnedRow], [dunnedPaidRow], [failedCountRow], [latestFailure]] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(${invoices.amount} - ${invoices.amountPaid}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.orgId, orgId), sql`${invoices.status} NOT IN ('paid', 'written_off')`)),
    db.select({ total: sql<string>`coalesce(sum(${invoices.amount}), 0)` })
      .from(invoices)
      .where(and(
        eq(invoices.orgId, orgId),
        eq(invoices.status, 'paid'),
        sql`${invoices.id} IN (SELECT ${dunningRuns.invoiceId} FROM ${dunningRuns} WHERE ${dunningRuns.orgId} = ${orgId})`,
      )),
    db.select({ count: sql<string>`count(*)` })
      .from(dunningRuns)
      .where(and(
        eq(dunningRuns.orgId, orgId),
        sql`${dunningRuns.status} IN ('sent', 'delivered')`,
        sql`${dunningRuns.sentAt} >= now() - interval '7 days'`,
      )),
    db.select({ count: sql<string>`count(distinct ${dunningRuns.invoiceId})` })
      .from(dunningRuns)
      .where(eq(dunningRuns.orgId, orgId)),
    db.select({ count: sql<string>`count(distinct ${invoices.id})` })
      .from(invoices)
      .innerJoin(dunningRuns, eq(dunningRuns.invoiceId, invoices.id))
      .where(and(eq(invoices.orgId, orgId), eq(invoices.status, 'paid'))),
    // Failures are the thing a green "ON" status can otherwise hide — a
    // misconfigured sender domain fails every email silently unless this
    // is surfaced explicitly, badge-only wasn't enough to notice it.
    db.select({ count: sql<string>`count(*)` })
      .from(dunningRuns)
      .where(and(eq(dunningRuns.orgId, orgId), eq(dunningRuns.status, 'failed'))),
    db.select({ error: dunningRuns.error, createdAt: dunningRuns.createdAt })
      .from(dunningRuns)
      .where(and(eq(dunningRuns.orgId, orgId), eq(dunningRuns.status, 'failed')))
      .orderBy(desc(dunningRuns.createdAt))
      .limit(1),
  ]);
  const revenueAtRisk = parseFloat(riskRow?.total ?? '0');
  const recoveredTotal = parseFloat(recoveredRow?.total ?? '0');
  const sentLast7d = parseInt(sentRow?.count ?? '0', 10);
  const dunnedCount = parseInt(dunnedRow?.count ?? '0', 10);
  const dunnedPaidCount = parseInt(dunnedPaidRow?.count ?? '0', 10);
  const recoveryRate = dunnedCount > 0 ? Math.round((dunnedPaidCount / dunnedCount) * 100) : null;
  const failedTotal = parseInt(failedCountRow?.count ?? '0', 10);

  return (
    <AppShell title="AI Dunning" subtitle="Automated, tone-aware reminders — written by Gemini, sent on your schedule.">
      <DunningTour />
      <DunningStuckHelper />
      {/* Composer: when the page is opened from a per-customer follow-up
          recommendation (?customerId=...&tone=...&channel=...) we pre-fill
          the Gemini-backed preview for the customer's oldest unpaid invoice
          and mount it at the top. Empty state and missing-contact state are
          shown in-line so the operator gets immediate feedback instead of a
          silent composer. */}
      {targetCustomerId && (composer || composerError) && (
        <div className="card mb-5 border-brand-200">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-brand-600 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-ink-900 truncate">
                  {composer ? `Draft reminder for ${composer.customerName}` : 'Cannot draft reminder'}
                </div>
                {composer && (
                  <div className="text-xs text-ink-600 mt-0.5 truncate">
                    {formatCurrency(parseFloat(composer.amount), composer.currency)} · {composer.daysOverdue}d overdue · {targetTone} · {targetChannel}
                  </div>
                )}
              </div>
            </div>
            <Link
              href={`/dashboard/customers/${targetCustomerId}`}
              className="btn-ghost text-xs shrink-0"
            >
              <ArrowLeft className="h-3 w-3" />Back to customer
            </Link>
          </div>

          {composerError ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-sm text-ink-800">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <span>{composerError}</span>
            </div>
          ) : (
            <DunningPreview
              invoiceId={composer!.invoiceId}
              customerName={composer!.customerName}
              amount={composer!.amount}
              currency={composer!.currency}
              daysOverdue={composer!.daysOverdue}
              channel={targetChannel}
              tone={targetTone}
              email={composer!.email}
              phone={composer!.phone}
              onSent={() => {
                // After a successful send, the user still sees the sequence
                // editor below. No router push needed — the panel collapses
                // to a "Reminder sent" state on its own.
              }}
            />
          )}
        </div>
      )}

      {/* Impact strip — leads with what's at stake (loss aversion) and what
          automation has already recovered (progress), before asking the
          operator to configure anything. */}
      <div data-tour="impact" className="mb-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ImpactTile
          delay={0}
          icon={<ShieldAlert className="h-4 w-4" />}
          tone="amber"
          label="Revenue at risk"
          value={formatCurrency(revenueAtRisk)}
          sub="Open balance, unpaid invoices"
        />
        <ImpactTile
          delay={60}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="emerald"
          label="Recovered via dunning"
          value={formatCurrency(recoveredTotal)}
          sub="All time, invoices paid after a reminder"
        />
        <ImpactTile
          delay={120}
          icon={<Send className="h-4 w-4" />}
          tone="brand"
          label="Reminders sent"
          value={String(sentLast7d)}
          sub="Last 7 days"
        />
        <ImpactTile
          delay={180}
          icon={<Target className="h-4 w-4" />}
          tone="ink"
          label="Recovery rate"
          value={recoveryRate === null ? '—' : `${recoveryRate}%`}
          sub={dunnedCount > 0 ? `${dunnedPaidCount} of ${dunnedCount} invoices dunned` : 'No dunning history yet'}
        />
      </div>

      {/* Failures don't show up in the on/off status above — "Automatic
          sending is ON" is still true even if every send is bouncing off a
          misconfigured provider. Surface that explicitly, with the real
          reason, instead of leaving it buried in a "failed" badge below. */}
      {failedTotal > 0 && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <span className="font-medium text-red-900">
              {failedTotal} reminder{failedTotal === 1 ? '' : 's'} failed to send
            </span>
            {latestFailure?.error && (
              <span className="text-red-800"> — {latestFailure.error}</span>
            )}
          </div>
        </div>
      )}

      {/* Control panel — the one switch that matters on this page, plus a
          secondary route to the deeper report so it doesn't compete for
          attention with the primary on/off decision. */}
      <div data-tour="control" className="mb-5 card !py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`relative h-9 w-9 shrink-0 rounded-full grid place-items-center ${active ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-emerald-500 animate-pulse-soft' : 'bg-amber-500'}`} />
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-ink-900">{active ? 'Automatic sending is on' : 'Automatic sending is off'}</div>
            <p className="text-xs text-ink-600 mt-0.5 truncate">
              {active
                ? 'Steps below fire on their own, by days overdue — no one has to click send.'
                : 'Nothing sends on its own right now. One-off reminders below still work.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ReplayTourButton className="btn-ghost text-sm" />
          <Link href="/dashboard/dunning/performance" className="btn-ghost text-sm">
            <BarChart3 className="h-3.5 w-3.5" />Full report<ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <form action={async () => { 'use server'; if (seq) { await db.update(dunningSequences).set({ isActive: !active, updatedAt: new Date() }).where(eq(dunningSequences.id, seq.id)); revalidatePath('/dashboard/dunning'); } }}>
            <button className={active ? 'btn-secondary text-sm' : 'btn-brand text-sm'} type="submit">
              {active ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Resume</>}
            </button>
          </form>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card">
          <div>
            <h2 className="h3">Default sequence</h2>
            <p className="text-sm text-ink-600 mt-1">Customers are sent reminders in this order, starting 1 day after the invoice is due.</p>
          </div>

          <div className="mt-5">
            <SequenceEditor initialSteps={(seq?.steps ?? DEFAULT_STEPS) as any} sequenceId={seq!.id} />
          </div>
        </div>

        <div data-tour="activity" className="card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="h3">Recent activity</h2>
              <p className="text-sm text-ink-600 mt-1">Last 20 dunning actions.</p>
            </div>
            {recentRuns.length > 0 && (
              <Link href="/dashboard/dunning/performance" className="text-xs font-medium text-brand-600 hover:text-brand-700 shrink-0 inline-flex items-center gap-0.5">
                See all<ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <div className="mt-4 space-y-1 max-h-[480px] overflow-y-auto">
            {recentRuns.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="h-6 w-6 mx-auto text-ink-300" />
                <p className="mt-2 text-sm text-ink-500">No activity yet.</p>
                <Link href="/dashboard/integrations" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                  Connect an integration<ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
            {recentRuns.map(({ run, customerId, customerName, invoiceNumber }: typeof recentRuns[number]) => {
              const failed = run.status === 'failed';
              return (
                <Link
                  key={run.id}
                  href={`/dashboard/customers/${customerId}`}
                  className={`flex items-start gap-2 text-sm -mx-2 px-2 py-1.5 rounded-lg transition-colors ${failed ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-ink-50'}`}
                >
                  {run.channel === 'sms' ? <MessageSquare className="h-3.5 w-3.5 text-ink-500 mt-0.5 shrink-0" /> : <Mail className="h-3.5 w-3.5 text-ink-500 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`badge text-[10px] ${run.status === 'sent' || run.status === 'delivered' ? 'badge-success' : failed ? 'badge-danger' : 'badge-neutral'}`}>{run.status}</span>
                      <span className={`text-xs ${failed ? 'text-red-700 font-medium' : 'text-ink-500'}`}>
                        {run.sentAt ? new Date(run.sentAt).toLocaleString() : failed ? 'not sent' : 'queued'}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-ink-900 truncate">To: {customerName} · Invoice {invoiceNumber}</div>
                    {failed && run.error ? (
                      <div className="text-xs text-red-700 truncate" title={run.error}>{run.error}</div>
                    ) : (
                      <div className="text-xs text-ink-700 truncate">{run.subject ?? 'SMS reminder'}</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ImpactTile({
  icon, label, value, sub, tone, delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: 'amber' | 'emerald' | 'brand' | 'ink';
  delay?: number;
}) {
  const toneClasses: Record<'amber' | 'emerald' | 'brand' | 'ink', string> = {
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    brand: 'bg-brand-50 text-brand-600',
    ink: 'bg-ink-100 text-ink-600',
  };
  return (
    <div
      className="stat-tile animate-slide-up hover:shadow-md transition-shadow"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-500 uppercase tracking-wider font-medium">{label}</div>
        <span className={`h-7 w-7 rounded-lg grid place-items-center shrink-0 ${toneClasses[tone]}`}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-display font-bold text-ink-950">{value}</div>
      <div className="mt-1 text-xs text-ink-500">{sub}</div>
    </div>
  );
}
