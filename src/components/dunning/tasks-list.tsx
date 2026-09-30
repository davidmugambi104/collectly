'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, SkipForward, Loader2, Phone } from 'lucide-react';

export type TaskItem = {
  id: string; title: string | null; note: string; status: string;
  customerId: string; customerName: string; phone: string | null;
  invoiceId: string; invoiceNumber: string; dueLabel: string; createdLabel: string;
};

export function TasksList({ items, open }: { items: TaskItem[]; open: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: 'done' | 'skip') {
    setBusy(`${id}:${action}`); setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
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
          </li>
        ))}
      </ul>
    </div>
  );
}
