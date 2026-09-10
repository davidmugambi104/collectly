'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';

export function WriteOffButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function writeOff() {
    if (!confirm('Write off this invoice? It will stop appearing in dunning and collections, and this cannot be undone from here.')) return;
    const reason = prompt('Reason (optional, shown on the customer timeline):') || undefined;
    setLoading(true);
    try {
      const res = await fetch('/api/invoices/write-off', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invoiceId, reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      router.refresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  /* Giving up on a debt is irreversible, so it must never be the easiest thing
     on the row — but a red button shouted at every invoice is melodrama, and
     operators stop reading it. The resting state is a plain ghost control and
     the danger colour only arrives on hover/focus, at the moment of intent. */
  return (
    <button
      onClick={writeOff}
      disabled={loading}
      aria-busy={loading}
      title="Write off — stops dunning and cannot be undone here"
      className="btn-ghost text-ink-600 transition-colors hover:bg-danger-50 hover:text-danger-700 focus-visible:bg-danger-50 focus-visible:text-danger-700"
    >
      {loading
        ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        : <XCircle aria-hidden="true" className="h-4 w-4" />}
      Write off
    </button>
  );
}
