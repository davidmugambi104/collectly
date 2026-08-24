import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { events } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { formatDate } from '@/lib/utils';
import { Mail, MessageSquare, User, CreditCard, Sparkles, Send, type LucideIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ICON: Record<string, LucideIcon> = {
  'invoice.created': CreditCard,
  'invoice.paid': CreditCard,
  'dunning.sent': Send,
  'customer.created': User,
  'reminder.sent': Mail,
  'sms.sent': MessageSquare,
};

export default async function EventsPage() {
  const { userId, orgId } = await getAuth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const rows = await db.select().from(events).where(eq(events.orgId, orgId)).orderBy(desc(events.createdAt)).limit(100);

  return (
    <AppShell title="Activity" subtitle="Audit log of every action in your workspace.">
      {rows.length === 0 ? (
        <div className="card text-center py-10">
          <Sparkles className="h-6 w-6 mx-auto text-ink-400" />
          <h3 className="mt-3 font-semibold text-ink-900">No activity yet</h3>
          <p className="mt-1 text-sm text-ink-600">Connect an integration or send a reminder to start logging events.</p>
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {rows.map((e: typeof rows[number]) => {
            const Icon = ICON[e.type] ?? Sparkles;
            return (
              <div key={e.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="h-8 w-8 rounded-lg bg-ink-100 grid place-items-center text-ink-600"><Icon className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-900">{e.type}</div>
                  {e.payload && <div className="text-xs text-ink-600 font-mono truncate">{JSON.stringify(e.payload)}</div>}
                </div>
                <div className="text-xs text-ink-500 whitespace-nowrap">{formatDate(e.createdAt)}</div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
