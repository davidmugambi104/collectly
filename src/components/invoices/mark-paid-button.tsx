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
      await fetch('/api/invoices/mark-paid', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ invoiceId }) });
      setDone(true);
      router.refresh();
    } finally { setLoading(false); }
  }

  if (done) {
    return <button className="btn-success text-sm"><CheckCircle2 className="h-3.5 w-3.5" />Marked paid</button>;
  }
  return <button onClick={markPaid} disabled={loading} className="btn-success text-sm">{loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Mark as paid</button>;
}
