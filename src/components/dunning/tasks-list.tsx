'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, SkipForward, Loader2, Phone, User } from 'lucide-react';
import type { OrgMember } from '@/lib/dunning/task-assignment';

export type TaskItem = {
  id: string; title: string | null; note: string; status: string;
  assigneeId: string | null; assigneeName: string | null;
  customerId: string; customerName: string; phone: string | null;
  invoiceId: string; invoiceNumber: string; dueLabel: string; createdLabel: string;
};

export function TasksList({ items, open, members, membersError, viewerId }: { items: TaskItem[]; open: boolean; members: OrgMember[]; membersError: boolean; viewerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: 'done' | 'skip' | 'assign', assigneeId?: string | null) {
    setBusy(`${id}:${action}`); setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action === 'assign' ? { action, assigneeId } : { action }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
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
                  <button className="btn-primary btn-sm" disabled={!!busy} onClick={() => act(t.id, 'done')}>
                    {busy === `${t.id}:done` ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Check aria-hidden="true" className="h-3.5 w-3.5" />}Done
                  </button>
                </div>
              ) : <span className="badge-neutral">{t.status === 'sent' ? 'Done' : 'Skipped'}</span>}
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{t.note}</p>
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
