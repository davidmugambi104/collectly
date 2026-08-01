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
import { Sparkles, Mail, MessageSquare, Pause, Play, BarChart3, AlertCircle, ArrowLeft } from 'lucide-react';
import { DunningPreview } from '@/components/dunning/preview';
import { SequenceEditor } from '@/components/dunning/sequence-editor';

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
    .select()
    .from(dunningRuns)
    .where(eq(dunningRuns.orgId, orgId))
    .orderBy(desc(dunningRuns.createdAt))
    .limit(20);

  const active = seq?.isActive ?? true;

  return (
    <AppShell title="AI Dunning" subtitle="Automated, tone-aware reminders — written by Gemini, sent on your schedule.">
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
              onSent={() => {
                // After a successful send, the user still sees the sequence
                // editor below. No router push needed — the panel collapses
                // to a "Reminder sent" state on its own.
              }}
            />
          )}
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <Link href="/dashboard/dunning/performance" className="btn-secondary text-sm">
          <BarChart3 className="h-3.5 w-3.5" />View performance
        </Link>
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="h3">Default sequence</h2>
              <p className="text-sm text-ink-600 mt-1">Customers are sent reminders in this order, starting 1 day after the invoice is due.</p>
            </div>
            <form action={async () => { 'use server'; if (seq) { await db.update(dunningSequences).set({ isActive: !active, updatedAt: new Date() }).where(eq(dunningSequences.id, seq.id)); revalidatePath('/dashboard/dunning'); } }}>
              <button className={active ? 'btn-secondary text-sm' : 'btn-brand text-sm'} type="submit">
                {active ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Resume</>}
              </button>
            </form>
          </div>

          <div className="mt-5">
            <SequenceEditor initialSteps={(seq?.steps ?? DEFAULT_STEPS) as any} sequenceId={seq!.id} />
          </div>
        </div>

        <div className="card">
          <h2 className="h3">Recent activity</h2>
          <p className="text-sm text-ink-600 mt-1">Last 20 dunning actions.</p>
          <div className="mt-4 space-y-2 max-h-[480px] overflow-y-auto">
            {recentRuns.length === 0 && <div className="text-sm text-ink-500 text-center py-8">No activity yet. Connect an integration and turn on a sequence to start.</div>}
            {recentRuns.map((run: typeof recentRuns[number]) => (
              <div key={run.id} className="flex items-start gap-2 text-sm">
                {run.channel === 'sms' ? <MessageSquare className="h-3.5 w-3.5 text-ink-500 mt-0.5" /> : <Mail className="h-3.5 w-3.5 text-ink-500 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`badge text-[10px] ${run.status === 'sent' || run.status === 'delivered' ? 'badge-success' : run.status === 'failed' ? 'badge-danger' : 'badge-neutral'}`}>{run.status}</span>
                    <span className="text-xs text-ink-500">{run.sentAt ? new Date(run.sentAt).toLocaleString() : 'queued'}</span>
                  </div>
                  <div className="text-xs text-ink-700 truncate">{run.subject ?? 'SMS reminder'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
