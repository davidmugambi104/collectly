import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { customers, smsConsentEvents } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ensureSmsConsentSchema } from '@/lib/sms-consent-schema';
import { MessageSquare, Check, X, Clock, Minus, type LucideIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * The consent audit, made readable.
 *
 * Twilio's toll-free verification asks for proof that recipients opted in. The
 * screenshot of the handset thread is the customer's side of that; this is
 * ours, and it is the side that has to survive someone asking "show me the
 * record" six months later.
 *
 * Message text is shown verbatim, never summarised. A paraphrase of what we
 * sent is not evidence of what we sent.
 */
const STATUS_META: Record<string, { label: string; badge: string; icon: LucideIcon }> = {
  opted_in: { label: 'Opted in', badge: 'badge-success', icon: Check },
  pending: { label: 'Invite sent', badge: 'badge-warn', icon: Clock },
  opted_out: { label: 'Opted out', badge: 'badge-danger', icon: X },
  none: { label: 'Not asked', badge: 'badge-neutral', icon: Minus },
};

const EVENT_META: Record<string, { label: string; tone: string }> = {
  invite_sent: { label: 'Invite sent', tone: 'text-brand-600' },
  opted_in: { label: 'Opted in', tone: 'text-success-600' },
  opted_out: { label: 'Opted out', tone: 'text-danger-600' },
};

export default async function SmsConsentPage() {
  const { userId, orgId } = await getAuth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  await ensureSmsConsentSchema();

  const people = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      status: customers.smsConsentStatus,
      at: customers.smsConsentAt,
    })
    .from(customers)
    .where(eq(customers.orgId, orgId))
    .orderBy(desc(customers.smsConsentAt))
    .limit(200);

  const withPhone = people.filter((p: typeof people[number]) => p.phone);
  const events = await db
    .select()
    .from(smsConsentEvents)
    .where(eq(smsConsentEvents.orgId, orgId))
    .orderBy(desc(smsConsentEvents.createdAt))
    .limit(100);

  const counts: Record<string, number> = {};
  for (const p of withPhone) {
    const k = p.status ?? 'none';
    counts[k] = (counts[k] ?? 0) + 1;
  }

  return (
    <AppShell
      title="SMS consent"
      subtitle="Who agreed to receive payment reminders by text, and the record of how they agreed."
    >
      <div className="grid gap-3 sm:grid-cols-4">
        {(['opted_in', 'pending', 'opted_out', 'none'] as const).map((k) => (
          <div key={k} className="panel px-4 py-3">
            <p className="app-meta">{STATUS_META[k].label}</p>
            <p className="app-title mt-1 tabular-nums">{counts[k] ?? 0}</p>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="app-heading">Contacts with a phone number</h2>
        <div className="panel mt-2 overflow-x-auto">
          <table className="app-table w-full">
            <thead>
              <tr>
                <th className="text-left">Customer</th>
                <th className="text-left">Phone</th>
                <th className="text-left">Status</th>
                <th className="text-left">Since</th>
              </tr>
            </thead>
            <tbody>
              {withPhone.length === 0 ? (
                <tr><td colSpan={4} className="app-body py-8 text-center text-ink-500">No contacts have a phone number on file yet.</td></tr>
              ) : withPhone.map((p: typeof people[number]) => {
                const meta = STATUS_META[p.status ?? 'none'] ?? STATUS_META.none;
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="font-mono text-2xs">{p.phone}</td>
                    <td><span className={meta.badge}>{meta.label}</span></td>
                    <td className="app-meta">{p.at ? new Date(p.at).toISOString().slice(0, 16).replace('T', ' ') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="app-heading">Consent log</h2>
        <p className="app-body mt-1 text-ink-500">
          Append-only. Message text is recorded verbatim — this is the record Twilio&apos;s toll-free
          verification asks for. Scoped to this workspace: a STOP from a number we cannot match to
          one of your contacts is still honoured and recorded, but it belongs to no workspace and so
          is not listed here.
        </p>
        <div className="panel mt-2">
          {events.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="chip-icon mx-auto h-11 w-11">
                <MessageSquare aria-hidden="true" className="h-5 w-5 text-brand-500" />
              </div>
              <h3 className="app-heading mt-3">Nothing recorded yet</h3>
              <p className="app-body mx-auto mt-1.5 max-w-sm text-ink-500">
                Send an opt-in invite to a contact with a phone number and it will appear here.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-ink-200/60">
              {events.map((e: typeof events[number]) => {
                const meta = EVENT_META[e.eventType] ?? { label: e.eventType, tone: 'text-ink-500' };
                return (
                  <li key={e.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className={`app-label ${meta.tone}`}>{meta.label}</span>
                      <span className="font-mono text-2xs text-ink-500">{e.phone}</span>
                      {!e.customerId && <span className="badge-warn">unmatched contact</span>}
                      <span className="app-meta ml-auto">
                        {new Date(e.createdAt).toISOString().slice(0, 19).replace('T', ' ')} UTC
                      </span>
                    </div>
                    {e.messageText && (
                      <p className="mt-1.5 rounded-md bg-ink-50 px-2.5 py-1.5 font-mono text-2xs text-ink-700">
                        {e.messageText}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>
    </AppShell>
  );
}
