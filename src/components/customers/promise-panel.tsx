'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

type Invoice = { id: string; number: string; currency: string };
type Promise = {
  id: string;
  invoiceId: string;
  promisedAmount: string;
  promisedDate: string | Date | null;
  currency: string | null;
  status: string;
  sourceText: string | null;
};

export function PromisePanel({
  customerId,
  invoices,
  promises,
}: {
  customerId: string;
  invoices: Invoice[];
  promises: Promise[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const active = promises.filter((p) => p.status === 'active');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/promises', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerId,
          invoiceId: form.get('invoiceId'),
          promisedAmount: form.get('promisedAmount'),
          promisedDate: form.get('promisedDate'),
          sourceText: form.get('sourceText') || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setShowForm(false);
      router.refresh();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function setStatus(id: string, status: 'fulfilled' | 'broken') {
    setActingId(id); setError(null);
    try {
      const res = await fetch(`/api/promises/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      router.refresh();
    } catch (e: any) { setError(e.message); } finally { setActingId(null); }
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="h3">Active promises to pay</h2>
        {invoices.length > 0 && (
          <button className="btn-secondary text-xs" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ Log a promise'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="space-y-3 mb-4 border border-ink-200 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Invoice</label>
              <select name="invoiceId" required className="input">
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>{inv.number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Amount promised</label>
              <input name="promisedAmount" type="number" step="0.01" min="0.01" required className="input" placeholder="1500.00" />
            </div>
            <div>
              <label className="label">Promised date</label>
              <input name="promisedDate" type="date" required className="input" />
            </div>
            <div>
              <label className="label">Source (optional)</label>
              <input name="sourceText" className="input" placeholder="e.g. said on call 8/2" />
            </div>
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>}
          <div className="flex justify-end">
            <button disabled={loading} className="btn-primary text-sm">{loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save promise</button>
          </div>
        </form>
      )}

      {active.length === 0 ? (
        <p className="text-sm text-ink-500">No active promises</p>
      ) : (
        <div className="space-y-2">
          {active.map((p) => (
            <div key={p.id} className="flex items-center justify-between border border-emerald-200 bg-emerald-50/30 rounded-lg p-3">
              <div>
                <div className="font-semibold text-ink-900">
                  {formatCurrency(parseFloat(p.promisedAmount), p.currency ?? 'USD')} by {formatDate(p.promisedDate)}
                </div>
                {p.sourceText && (
                  <div className="text-xs text-ink-600 mt-1 italic">&quot;{p.sourceText}&quot;</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={actingId === p.id}
                  onClick={() => setStatus(p.id, 'fulfilled')}
                  className="btn-secondary text-xs"
                  title="Mark fulfilled"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Fulfilled
                </button>
                <button
                  disabled={actingId === p.id}
                  onClick={() => setStatus(p.id, 'broken')}
                  className="btn-secondary text-xs"
                  title="Mark broken"
                >
                  <XCircle className="h-3.5 w-3.5" /> Broken
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
