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

  if (done) {
    return <button className="btn-success text-sm"><CheckCircle2 className="h-3.5 w-3.5" />Marked paid</button>;
  }
  return <button onClick={markPaid} disabled={loading} className="btn-success text-sm">{loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Mark as paid</button>;
}
