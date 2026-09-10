'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';

export function MarkAsPaidButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function markPaid() {
    if (!confirm('Mark this invoice as paid? This records a manual payment.')) return;
    setLoading(true);
    try {
      // Was unconditional — a 401 (lapsed session), 404 (invoice already
      // deleted/written off elsewhere), or 500 still flipped this to
      // "Marked paid" with a checkmark. On a page whose entire job is
      // financial record-keeping, that's a false confirmation on top of
      // an untouched balance.
      const res = await fetch('/api/invoices/mark-paid', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ invoiceId }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Failed (${res.status})`);
      setDone(true);
      router.refresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to mark as paid');
    } finally {
      setLoading(false);
    }
  }

  // Full-size rather than btn-sm: on an open invoice this is the outcome the
  // whole page exists to reach, so it gets the largest target in the action row
  // (Fitts) and the only filled non-neutral fill on the surface.
  if (done) {
    return (
      // The confirmation replaces the control in place — announced, and no
      // longer clickable, so a second POST can't be fired at a paid invoice.
      <span role="status" className="btn-success cursor-default opacity-90">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />Marked paid
      </span>
    );
  }
  return (
    <button onClick={markPaid} disabled={loading} aria-busy={loading} className="btn-success">
      {loading
        ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        : <CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
      Mark as paid
    </button>
  );
}
