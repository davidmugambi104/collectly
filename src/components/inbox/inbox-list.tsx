'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, X, Mail, AlertTriangle, Sparkles, CalendarClock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type InboxItem = {
  id: string;
  fromAddress: string | null;
  fromName: string | null;
  subject: string | null;
  body: string;
  classification: string;
  aiSummary: string | null;
  aiRecommendedAction: string | null;
  aiSuggestedPromiseDate: string | Date | null;
  status: string;
  receivedAt: string | Date;
  customerId: string | null;
  customerName: string | null;
  invoiceNumber: string | null;
};

// Nine bespoke coloured pills (`bg-*-100 text-*-700 border-*-200`, two of them
// on raw blue-*/purple-* with no token behind them) became nine walls of colour
// in a stacked list. These now map onto the system badges: a neutral chip whose
// hue survives only in the 6px dot, with the label always carrying the meaning.
const CLASSIFICATION_STYLE: Record<string, { label: string; className: string }> = {
  will_pay_date: { label: 'Will pay by date', className: 'badge-success' },
  already_paid: { label: 'Says already paid', className: 'badge-info' },
  disputed: { label: 'Disputed', className: 'badge-danger' },
  missing_po: { label: 'Needs PO / paperwork', className: 'badge-warn' },
  wrong_contact: { label: 'Wrong contact', className: 'badge-neutral' },
  needs_payment_plan: { label: 'Wants a payment plan', className: 'badge-info' },
  general_question: { label: 'General question', className: 'badge-neutral' },
  no_action: { label: 'No action needed', className: 'badge-neutral' },
  unclassified: { label: 'Unclassified', className: 'badge-neutral' },
};

export function InboxList({ items, configured }: { items: InboxItem[]; configured: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<'new' | 'handled' | 'dismissed' | 'all'>('new');
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = filter === 'all' ? items : items.filter((m) => m.status === filter);

  async function setStatus(id: string, status: 'handled' | 'dismissed') {
    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/inbox/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActingId(null);
    }
  }

  const counts = {
    new: items.filter((m) => m.status === 'new').length,
    handled: items.filter((m) => m.status === 'handled').length,
    dismissed: items.filter((m) => m.status === 'dismissed').length,
    all: items.length,
  };

  return (
    <div>
      {/* Real segmented control rather than four independently-bordered pills.
          aria-pressed carries the active state to assistive tech, which the
          colour-only treatment never did. */}
      <div className="segmented mb-4">
        {(['new', 'handled', 'dismissed', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className="segmented-item capitalize"
          >
            {f} <span className="segmented-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      {error && <div role="alert" className="alert-danger mb-4">{error}</div>}

      {filtered.length === 0 ? (
        /* An empty state is a screen, not a shrug: something to look at, one
           sentence explaining why the list is empty, and the action that would
           put something in it. */
        <div className="panel px-6 py-16 text-center">
          {/* "No messages" and "no mailbox is being polled" look identical to
              the reader, and they are completely different situations: one is
              a quiet week, the other means no reply can EVER arrive here. The
              page computes whether AR_DUNNING_IMAP_USER is set; without this
              branch it passed that answer in and the component dropped it, so
              an inbox that could never receive anything sat looking merely
              empty. Say which one it is. */}
          <div className={`chip-icon mx-auto h-11 w-11 ${configured ? '' : 'ring-warn-200'}`}>
            {configured
              ? <Mail aria-hidden="true" className="h-5 w-5 text-brand-500" />
              : <AlertTriangle aria-hidden="true" className="h-5 w-5 text-warn-600" />}
          </div>
          {configured ? (
            <>
              <h2 className="app-heading mt-4">No {filter === 'all' ? '' : filter} messages</h2>
              <p className="app-body mx-auto mt-1.5 max-w-sm text-ink-500">
                Replies to dunning emails land here automatically, usually within
                a few minutes of a customer hitting reply.
              </p>
              <div className="mt-5">
                <Link href="/dashboard/dunning" className="btn-secondary btn-sm h-8">Send a reminder</Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="app-heading mt-4">Reply inbox isn&apos;t connected</h2>
              <p className="app-body mx-auto mt-1.5 max-w-md text-ink-500">
                No mailbox is being polled, so customer replies will never appear
                here — they go to your normal inbox instead. This page stays empty
                until <code className="font-mono text-2xs">AR_DUNNING_IMAP_USER</code> is
                set on the deployment.
              </p>
            </>
          )}
        </div>
      ) : (
        /* One panel of hairline-separated rows, not a stack of free-floating
           cards. A card per message gives every reply its own frame and its own
           shadow, so twenty replies read as twenty documents; a triage list has
           to read as one list you run down. Unread state lives in a left gutter
           dot plus text weight, the way every inbox you already know does it. */
        <div className="panel">
          <ul role="list" aria-label="Customer replies" className="divide-y divide-ink-200/60">
            {filtered.map((m) => {
              const style = CLASSIFICATION_STYLE[m.classification] ?? CLASSIFICATION_STYLE.unclassified;
              const isNew = m.status === 'new';
              const busy = actingId === m.id;
              return (
                <li key={m.id} className="group flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-ink-50">
                  {/* Fixed gutter, occupied or not, so every row's text starts
                      on the same axis whether or not it is unread. */}
                  <span aria-hidden="true" className="mt-1.5 grid h-1.5 w-1.5 shrink-0 place-items-center">
                    {isNew && (
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-600 ring-[3px] ring-brand-500/15" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={`truncate text-[13px] leading-[18px] ${
                            isNew ? 'font-semibold text-ink-950' : 'font-medium text-ink-600'
                          }`}
                        >
                          {m.fromName || m.fromAddress || 'Unknown sender'}
                        </span>
                        <span className={style.className}>{style.label}</span>
                        {m.customerName && m.customerId && (
                          <Link href={`/dashboard/customers/${m.customerId}`} className="link-quiet text-2xs">
                            {m.customerName}
                            {m.invoiceNumber ? <span className="font-mono"> · {m.invoiceNumber}</span> : ''}
                          </Link>
                        )}
                      </div>

                      {/* Timestamp and the two triage actions sit on one line at
                          the right, so acting on a row never means travelling to
                          a different corner of it. Actions are quiet until the
                          row is hovered or focused — present, but not twenty
                          pairs of buttons shouting down the list. */}
                      <div className="flex shrink-0 items-center gap-2">
                        <time
                          dateTime={new Date(m.receivedAt).toISOString()}
                          className="app-meta num whitespace-nowrap"
                        >
                          {formatDate(m.receivedAt)}
                        </time>
                        {isNew ? (
                          <div className="flex items-center gap-1.5 opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            <button
                              disabled={busy}
                              aria-busy={busy}
                              onClick={() => setStatus(m.id, 'handled')}
                              className="btn-secondary btn-sm h-7 text-2xs"
                              title="Mark handled"
                            >
                              {busy ? (
                                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                              )}{' '}
                              Handled
                            </button>
                            <button
                              disabled={busy}
                              aria-busy={busy}
                              onClick={() => setStatus(m.id, 'dismissed')}
                              className="btn-secondary btn-sm h-7 w-7 px-0 text-2xs"
                              title="Dismiss"
                            >
                              <X aria-hidden="true" className="h-3.5 w-3.5" />
                              <span className="sr-only">Dismiss</span>
                            </button>
                          </div>
                        ) : (
                          <span className="badge-neutral capitalize">{m.status}</span>
                        )}
                      </div>
                    </div>

                    {m.subject && (
                      <div
                        className={`mt-1 truncate text-[13px] leading-[18px] ${
                          isNew ? 'font-medium text-ink-800' : 'text-ink-600'
                        }`}
                      >
                        {m.subject}
                      </div>
                    )}
                    {/* Newlines collapse in a preview: a clamped block of raw
                        email otherwise clamps two blank lines and says nothing. */}
                    <div className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-ink-500">{m.body}</div>

                    {m.aiSummary && (
                      /* The AI read of the message, marked by the icon rather
                         than by the words "AI summary:" — the label is kept for
                         screen readers, where an icon says nothing. A tinted
                         inset, not another bordered card inside the row. */
                      <div
                        className="mt-2 flex gap-2 rounded-lg border bg-ink-50 px-2.5 py-1.5"
                       
                      >
                        <Sparkles aria-hidden="true" className="mt-[3px] h-3 w-3 shrink-0 text-brand-500" />
                        <div className="min-w-0 space-y-0.5 text-2xs leading-4">
                          <div className="text-ink-800">
                            <span className="sr-only">AI summary: </span>
                            {m.aiSummary}
                          </div>
                          {m.aiRecommendedAction && (
                            <div className="text-ink-700">
                              <span className="font-medium text-ink-500">Recommended:</span> {m.aiRecommendedAction}
                            </div>
                          )}
                          {m.aiSuggestedPromiseDate && (
                            <div className="flex items-center gap-1 text-ink-700">
                              <CalendarClock aria-hidden="true" className="h-3 w-3 shrink-0 text-ink-400" />
                              <span className="font-medium text-ink-500">Suggested date:</span>
                              <span className="num">{formatDate(m.aiSuggestedPromiseDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
