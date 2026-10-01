'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Undo2 } from 'lucide-react';
import { useSendHold } from '@/components/dunning/use-send-hold';

export type StatementDraftItem = { id: string; customerId: string; customerName: string; email: string | null; summary: string; error: string | null };

/**
 * Monthly statements the scheduler drafted. Nothing is sent until a person approves one,
 * and approving waits 30 seconds with an Undo, like every other message sent by hand.
 */
export function StatementDraftsQueue({ items }: { items: StatementDraftItem[] }) {
  const router = useRouter();
  const hold = useSendHold();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (items.length === 0) return null;

  async function decide(id: string, action: 'approve' | 'skip') {
    setBusy(`${id}:${action}`); setError(null);
    try {
      const res = await fetch(`/api/statement-drafts/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      router.refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  }

  return (
    <section className="card-primary mb-6" aria-labelledby="stmt-queue-heading">
      <h2 id="stmt-queue-heading" className="app-heading">Statements waiting for approval</h2>
      <p className="app-meta mt-0.5 font-normal">Drafted for customers who are overdue. Nothing is sent until you approve it, and approving waits 30 seconds so you can undo it. Closing this page cancels a pending send.</p>
      {error && <div role="alert" className="alert-danger mt-3">{error}</div>}
      <ul className="mt-3 space-y-2" aria-label="Statement drafts">
        {items.map((it) => {
          const left = hold.secondsLeft(it.id);
          const holding = left !== null;
          return (
            <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border bg-white p-3 [border-color:var(--hair)]">
              <div className="min-w-0">
                <div className="app-label"><Link href={`/dashboard/customers/${it.customerId}`} className="link-quiet">{it.customerName}</Link></div>
                <div className="app-meta font-normal">{it.summary} · to {it.email ?? 'no email'} · <Link href={`/dashboard/customers/${it.customerId}/statement`} className="link-quiet">Preview</Link></div>
                {it.error && <div role="alert" className="mt-1 text-xs text-red-600">Last try failed: {it.error}</div>}
              </div>
              <div className="flex items-center gap-1">
                {holding ? (
                  <>
                    <span role="status" className="app-meta font-normal">Sending in {left}s</span>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => hold.cancel(it.id)}><Undo2 aria-hidden="true" className="h-3.5 w-3.5" />Undo</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn-ghost btn-sm" disabled={!!busy} onClick={() => decide(it.id, 'skip')}>{busy === `${it.id}:skip` && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Skip</button>
                    <button type="button" className="btn-primary btn-sm" disabled={!!busy} onClick={() => hold.start(it.id, () => decide(it.id, 'approve'))}>{busy === `${it.id}:approve` && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Approve and send</button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
