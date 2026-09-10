import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { events } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Mail, MessageSquare, User, CreditCard, Sparkles, Send, Activity, type LucideIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ICON: Record<string, LucideIcon> = {
  'invoice.created': CreditCard,
  'invoice.paid': CreditCard,
  'dunning.sent': Send,
  'customer.created': User,
  'reminder.sent': Mail,
  'sms.sent': MessageSquare,
};

// The only hue in the log, and only ever on a 14px glyph: money arriving reads
// green, something we sent reads accent, everything else stays neutral. A log
// where every row is the same grey shape is a wall to scan; one where every row
// is coloured is a wall to squint at.
const ICON_TONE: Record<string, string> = {
  'invoice.paid': 'text-success-600',
  'dunning.sent': 'text-brand-600',
  'reminder.sent': 'text-brand-600',
  'sms.sent': 'text-brand-600',
};

export default async function EventsPage() {
  const { userId, orgId } = await getAuth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const rows = await db.select().from(events).where(eq(events.orgId, orgId)).orderBy(desc(events.createdAt)).limit(100);

  return (
    <AppShell title="Activity" subtitle="Audit log of every action in your workspace.">
      {rows.length === 0 ? (
        <div className="panel px-6 py-16 text-center">
          <div className="chip-icon mx-auto h-11 w-11">
            <Activity aria-hidden="true" className="h-5 w-5 text-brand-500" />
          </div>
          <h2 className="app-heading mt-4">No activity yet</h2>
          <p className="app-body mx-auto mt-1.5 max-w-sm text-ink-500">
            Connect an integration or send a reminder to start logging events.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link href="/dashboard/integrations" className="btn-primary btn-sm h-8">Connect an integration</Link>
            <Link href="/dashboard/dunning" className="btn-secondary btn-sm h-8">Send a reminder</Link>
          </div>
        </div>
      ) : (
        /* A log is a list, so it is marked up as one, inside a `.panel` whose
           rows are separated by a hairline rather than each being a padded box
           inside a card. The event type is an identifier the way an invoice
           number is, so it sits in mono at the same 13px as the rest of the
           app; the payload is the same family a step quieter, and carries the
           full JSON in a title for the rows where truncation hides the part you
           needed. */
        <div className="panel">
          <ol className="divide-y divide-ink-200/60">
            {rows.map((e: typeof rows[number]) => {
              const Icon = ICON[e.type] ?? Sparkles;
              const payload = e.payload ? JSON.stringify(e.payload) : null;
              return (
                <li key={e.id} className="group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-ink-50">
                  <span className="chip-icon h-7 w-7">
                    <Icon aria-hidden="true" className={`h-3.5 w-3.5 ${ICON_TONE[e.type] ?? 'text-ink-500'}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[13px] font-medium leading-[18px] text-ink-900">{e.type}</div>
                    {payload && (
                      <div className="truncate font-mono text-2xs leading-4 text-ink-400" title={payload}>
                        {payload}
                      </div>
                    )}
                  </div>
                  <time
                    dateTime={new Date(e.createdAt).toISOString()}
                    className="app-meta num shrink-0 whitespace-nowrap pt-0.5"
                  >
                    {formatDate(e.createdAt)}
                  </time>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </AppShell>
  );
}
