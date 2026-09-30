'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, SkipForward, ShieldCheck, Undo2 } from 'lucide-react';
import { useSendHold } from './use-send-hold';

export type QueuedReminder = {
  runId: string;
  customerName: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  daysOverdue: number;
  /** Days until the due date, for a heads-up drafted before it. 0 once it is due. */
  dueInDays?: number;
  channel: 'email' | 'sms';
  subject: string | null;
  body: string;
};

/**
 * Reminders the scheduler drafted but did not send. Each one can be edited,
 * approved (sent) or skipped. Nothing here goes out until a person clicks, and
 * even then it waits 30 seconds so the click can be undone.
 */
export function ApprovalQueue({ approvalRequired, items }: { approvalRequired: boolean; items: QueuedReminder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hold = useSendHold();
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string }>>({});

  const edit = (it: QueuedReminder) => drafts[it.runId] ?? { subject: it.subject ?? '', body: it.body };

  async function act(it: QueuedReminder, action: 'approve' | 'skip') {
    setBusy(`${it.runId}:${action}`); setError(null);
    try {
      const e = edit(it);
      const res = await fetch(`/api/dunning/approvals/${it.runId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action === 'approve' ? { action, subject: e.subject, body: e.body } : { action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function setApproval(next: boolean) {
    setBusy('toggle'); setError(null);
    try {
      const res = await fetch('/api/dunning/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approvalRequired: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not save');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="approvals" className="card-primary mb-6" aria-labelledby="approvals-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="approvals-heading" className="app-heading flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-brand-600" />
            {approvalRequired ? 'Approve before sending' : 'Automatic sending'}
          </h2>
          <p className="app-meta mt-0.5 font-normal">
            {approvalRequired
              ? 'Mugavi drafts each reminder and waits. Nothing goes to a customer until you approve it.'
              : 'Reminders go out on your schedule without waiting for you. You get an email after each batch.'}
          </p>
        </div>
        <button
          className="btn-secondary btn-sm"
          disabled={busy === 'toggle'}
          aria-busy={busy === 'toggle'}
          onClick={() => setApproval(!approvalRequired)}
        >
          {busy === 'toggle' && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}
          {approvalRequired ? 'Send automatically instead' : 'Require my approval'}
        </button>
      </div>

      {error && <div role="alert" className="alert-danger mt-3">{error}</div>}

      {approvalRequired && items.length === 0 && (
        <p className="app-meta mt-4 font-normal">Nothing waiting. New drafts appear here after the next daily run, and you get an email when there are some.</p>
      )}

      {items.length > 0 && (
        <ul className="mt-4 space-y-3" aria-label="Reminders waiting for approval">
          {items.map((it) => {
            const e = edit(it);
            const sending = busy === `${it.runId}:approve`;
            const skipping = busy === `${it.runId}:skip`;
            const left = hold.secondsLeft(it.runId);
            const holding = left !== null;
            return (
              <li key={it.runId} className="rounded-[10px] border bg-white p-3 [border-color:var(--hair)]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="app-label">{it.customerName} · invoice {it.invoiceNumber}</div>
                  <div className="app-meta font-normal">
                    {it.currency} {it.amount} · {it.dueInDays ? `due in ${it.dueInDays}d` : `${it.daysOverdue}d overdue`} · {it.channel === 'sms' ? 'text message' : 'email'}
                  </div>
                </div>
                {it.channel === 'email' && (
                  <>
                    <label htmlFor={`subj-${it.runId}`} className="label mt-3">Subject</label>
                    <input
                      id={`subj-${it.runId}`}
                      className="input"
                      value={e.subject}
                      maxLength={200}
                      readOnly={holding}
                      onChange={(ev) => setDrafts((d) => ({ ...d, [it.runId]: { ...e, subject: ev.target.value } }))}
                    />
                  </>
                )}
                <label htmlFor={`body-${it.runId}`} className="label mt-3">Message</label>
                <textarea
                  id={`body-${it.runId}`}
                  className="input min-h-[120px]"
                  value={e.body}
                  maxLength={5000}
                  readOnly={holding}
                  onChange={(ev) => setDrafts((d) => ({ ...d, [it.runId]: { ...e, body: ev.target.value } }))}
                />
                <div className="mt-3 flex items-center justify-end gap-1">
                  {holding ? (
                    <>
                      <span role="status" className="app-meta mr-2 font-normal">Sending in {left}s. Close this page and it won&apos;t send.</span>
                      <button className="btn-secondary btn-sm" onClick={() => hold.cancel(it.runId)}>
                        <Undo2 aria-hidden="true" className="h-3.5 w-3.5" />
                        Undo
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => act(it, 'skip')} aria-busy={skipping}>
                        {skipping ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <SkipForward aria-hidden="true" className="h-3.5 w-3.5" />}
                        Skip this one
                      </button>
                      <button className="btn-primary btn-sm" disabled={!!busy} onClick={() => hold.start(it.runId, () => act(it, 'approve'))} aria-busy={sending}>
                        {sending ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Send aria-hidden="true" className="h-3.5 w-3.5" />}
                        Approve and send
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
