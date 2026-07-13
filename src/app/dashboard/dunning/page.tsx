export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { dunningSequences, dunningRuns } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { Sparkles, Mail, MessageSquare, Pause, Play, Edit2 } from 'lucide-react';

const DEFAULT_STEPS = [
  { id: 's1', daysFromDue: 1, channel: 'email', tone: 'friendly', subject: 'Quick reminder — Invoice {{number}}', template: 'Hi {{contact_name}}, just a quick nudge that Invoice {{number}} for {{amount}} was due on {{due_date}}. You can settle it here: {{payment_link}}' },
  { id: 's2', daysFromDue: 7, channel: 'email', tone: 'firm', subject: 'Invoice {{number}} is now 7 days past due', template: 'Hi {{contact_name}}, Invoice {{number}} for {{amount}} is now 7 days past due. Please review and settle at your earliest convenience: {{payment_link}}' },
  { id: 's3', daysFromDue: 14, channel: 'email', tone: 'firm', subject: 'Action required: Invoice {{number}}', template: 'Hi {{contact_name}}, our records show Invoice {{number}} for {{amount}} is 14 days overdue. Please confirm payment status or settle the balance: {{payment_link}}' },
  { id: 's4', daysFromDue: 30, channel: 'sms', tone: 'final', subject: undefined as any, template: 'Final notice: Invoice {{number}} for {{amount}} is 30+ days overdue. Please reply or settle: {{payment_link}}' },
];

export default async function DunningPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const [seq] = await db.select().from(dunningSequences).where(eq(dunningSequences.orgId, orgId)).limit(1);
  if (!seq) {
    // First-time setup: create the default sequence. The page will re-render
    // on the next request and pick it up — no revalidatePath needed in render.
    await db.insert(dunningSequences).values({
      id: nanoid(), orgId, name: 'Default', isActive: true, steps: DEFAULT_STEPS as any, pauseOnReply: true, pauseOnPayment: true,
    });
  }

  const recentRuns = await db
    .select()
    .from(dunningRuns)
    .where(eq(dunningRuns.orgId, orgId))
    .orderBy(desc(dunningRuns.createdAt))
    .limit(20);

  const active = seq?.isActive ?? true;

  return (
    <AppShell title="AI Dunning" subtitle="Automated, tone-aware reminders — written by GPT-4o, sent on your schedule.">
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

          <div className="mt-5 space-y-2.5">
            {(seq?.steps ?? DEFAULT_STEPS).map((step: any, i: number) => (
              <div key={step.id ?? i} className="flex items-start gap-3 rounded-lg border border-ink-200 p-3.5 hover:border-ink-300">
                <div className="h-8 w-8 rounded-md bg-ink-100 grid place-items-center text-xs font-semibold text-ink-700">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ink-900">Day {step.daysFromDue}</span>
                    <span className="badge-neutral capitalize">{step.channel}</span>
                    <span className={`badge capitalize ${step.tone === 'final' ? 'badge-danger' : step.tone === 'firm' ? 'badge-warn' : 'badge-success'}`}>{step.tone}</span>
                  </div>
                  {step.subject && <div className="mt-1 text-xs text-ink-700 truncate"><b>Subject:</b> {step.subject}</div>}
                  <div className="mt-1 text-xs text-ink-600 line-clamp-2">{step.template}</div>
                </div>
                <button className="btn-ghost text-xs"><Edit2 className="h-3 w-3" />Edit</button>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button className="btn-secondary text-sm">+ Add step</button>
            <button className="btn-ghost text-sm">Reset to default</button>
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
