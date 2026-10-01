'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, SkipForward, Loader2, Phone, User } from 'lucide-react';
import type { OrgMember } from '@/lib/dunning/task-assignment';
import { CALL_OUTCOMES, CALL_OUTCOME_LABELS, MAX_CALL_NOTE } from '@/lib/dunning/call-outcome';

export type TaskItem = {
  id: string; title: string | null; note: string; status: string;
  assigneeId: string | null; assigneeName: string | null;
  customerId: string; customerName: string; phone: string | null;
  invoiceId: string; invoiceNumber: string; dueLabel: string; createdLabel: string;
  /** Set on a closed task: what happened on the call. */
  outcomeLabel?: string | null; outcomeNote?: string | null;
};

export function TasksList({ items, open, members, membersError, viewerId }: { items: TaskItem[]; open: boolean; members: OrgMember[]; membersError: boolean; viewerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');

  async function act(id: string, action: 'done' | 'skip' | 'assign', assigneeId?: string | null) {
    setBusy(`${id}:${action}`); setError(null);
    try {
      const body = action === 'assign' ? { action, assigneeId } : action === 'done' ? { action, outcome: outcome || undefined, note: note || undefined } : { action };
      const res = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      if (action === 'done') { setClosing(null); setOutcome(''); setNote(''); }
      router.refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  }

  return (
    <div>
      {error && <div role="alert" className="alert-danger mb-3">{error}</div>}
      <ul className="space-y-3" aria-label={open ? 'Open call tasks' : 'Closed call tasks'}>
        {items.map((t) => (
          <li key={t.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold text-ink-900"><Phone aria-hidden="true" className="h-4 w-4 text-brand-600" />{t.title}</div>
                <div className="app-meta mt-0.5 font-normal">
                  <Link href={`/dashboard/customers/${t.customerId}`} className="link-quiet">{t.customerName}</Link>
                  {' · '}<Link href={`/dashboard/invoices/${t.invoiceId}`} className="link-quiet font-mono">{t.invoiceNumber}</Link>
                  {' · '}{t.dueLabel}{' · added '}{t.createdLabel}
                </div>
              </div>
              {open ? (
                <div className="flex items-center gap-1">
                  {t.phone && <a href={`tel:${t.phone}`} className="btn-secondary btn-sm"><Phone aria-hidden="true" className="h-3.5 w-3.5" />{t.phone}</a>}
                  <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => act(t.id, 'skip')}>
                    {busy === `${t.id}:skip` ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <SkipForward aria-hidden="true" className="h-3.5 w-3.5" />}Skip
                  </button>
                  <button className="btn-primary btn-sm" disabled={!!busy} aria-expanded={closing === t.id} onClick={() => { setClosing(closing === t.id ? null : t.id); setOutcome(''); setNote(''); }}>
                    <Check aria-hidden="true" className="h-3.5 w-3.5" />Done
                  </button>
                </div>
              ) : <span className="badge-neutral">{t.status === 'sent' ? 'Done' : 'Skipped'}</span>}
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{t.note}</p>
            {open && closing === t.id && (
              <div className="subform mt-3" role="group" aria-label={`Close the call to ${t.customerName}`}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`outcome-${t.id}`} className="label">How did it go? (optional)</label>
                    <select id={`outcome-${t.id}`} className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                      <option value="">Not saying</option>
                      {CALL_OUTCOMES.map((o) => <option key={o} value={o}>{CALL_OUTCOME_LABELS[o]}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`callnote-${t.id}`} className="label">Note (optional)</label>
                    <textarea id={`callnote-${t.id}`} className="input min-h-[70px]" maxLength={MAX_CALL_NOTE} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Said the payment run is Friday. Call again Monday if it is not in." />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary btn-sm" disabled={!!busy} onClick={() => act(t.id, 'done')}>
                    {busy === `${t.id}:done` && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Close the task
                  </button>
                  <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => setClosing(null)}>Cancel</button>
                </div>
                <p className="app-meta font-normal">The note is kept on the customer&apos;s timeline. Nothing is sent to the customer.</p>
              </div>
            )}
            {!open && (t.outcomeLabel || t.outcomeNote) && (
              <p className="mt-2 text-sm text-ink-700"><span className="font-semibold">{t.outcomeLabel ?? 'Call note'}</span>{t.outcomeNote ? <>: <span className="whitespace-pre-line">{t.outcomeNote}</span></> : null}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <User aria-hidden="true" className="h-3.5 w-3.5 text-ink-500" />
              {open && !membersError ? (
                <>
                  <label htmlFor={`assign-${t.id}`} className="app-meta font-normal">Assigned to</label>
                  <select id={`assign-${t.id}`} className="input !w-auto h-8 py-0 text-sm" disabled={!!busy} value={t.assigneeId ?? ''}
                    onChange={(e) => act(t.id, 'assign', e.target.value || null)}>
                    <option value="">Nobody</option>
                    {t.assigneeId && !members.some((m) => m.id === t.assigneeId) && <option value={t.assigneeId}>{t.assigneeName} (no longer on the team)</option>}
                    {members.map((m) => <option key={m.id} value={m.id}>{m.id === viewerId ? `${m.name} (you)` : m.name}</option>)}
                  </select>
                  {t.assigneeId !== viewerId && members.some((m) => m.id === viewerId) && (
                    <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => act(t.id, 'assign', viewerId)}>Take it</button>
                  )}
                  {busy === `${t.id}:assign` && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}
                </>
              ) : (
                <span className="app-meta font-normal">{t.assigneeName ? `Assigned to ${t.assigneeId === viewerId ? 'you' : t.assigneeName}` : 'Not assigned'}{open && membersError ? ' (could not load your team to change this)' : ''}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
