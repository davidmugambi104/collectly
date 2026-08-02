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
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={writeOff} disabled={loading} className="btn-secondary text-sm text-red-700">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
      Write off
    </button>
  );
}
