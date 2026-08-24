'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';

type Invoice = { id: string; number: string };
type Dispute = {
  id: string;
  reason: string;
  status: string;
  customerMessage: string | null;
  internalNotes: string | null;
};

// Must match the live `dispute_reason` Postgres enum exactly.
const REASONS = [
  { value: 'already_paid', label: 'Already paid' },
  { value: 'need_invoice_copy', label: 'Needs invoice copy' },
  { value: 'amount_incorrect', label: 'Amount incorrect' },
  { value: 'awaiting_approval', label: 'Awaiting internal approval' },
  { value: 'missing_po', label: 'Missing PO number' },
  { value: 'payment_plan_request', label: 'Requested a payment plan' },
  { value: 'contact_account_manager', label: 'Wants to contact account manager' },
  { value: 'other', label: 'Other' },
];

export function DisputePanel({
  customerId,
  invoices,
  disputes,
}: {
  customerId: string;
  invoices: Invoice[];
  disputes: Dispute[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const open = disputes.filter((d) => d.status === 'open' || d.status === 'in_progress');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerId,
          invoiceId: form.get('invoiceId'),
          reason: form.get('reason'),
          customerMessage: form.get('customerMessage') || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setShowForm(false);
      router.refresh();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function resolve(id: string) {
    setResolvingId(id); setError(null);
    try {
      const res = await fetch(`/api/disputes/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ internalNotes: notesById[id] || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      router.refresh();
    } catch (e: any) { setError(e.message); } finally { setResolvingId(null); }
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="h3">Open disputes</h2>
        {invoices.length > 0 && (
          <button className="btn-secondary text-xs" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ Open dispute'}
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
              <label className="label">Reason</label>
              <select name="reason" required className="input" defaultValue="other">
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Customer&apos;s message (optional)</label>
              <textarea name="customerMessage" className="input" rows={2} placeholder="What the customer said" />
            </div>
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>}
          <div className="flex justify-end">
            <button disabled={loading} className="btn-primary text-sm">{loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Open dispute</button>
          </div>
        </form>
      )}

      {open.length === 0 ? (
        <p className="text-sm text-ink-500">No open disputes</p>
      ) : (
        <div className="space-y-2">
          {open.map((d) => (
            <div key={d.id} className="border border-red-200 bg-red-50/30 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-ink-900">
                    {d.reason.replace(/_/g, ' ')}
                  </div>
                  {d.customerMessage && (
                    <div className="text-sm text-ink-700 mt-1 italic">&quot;{d.customerMessage}&quot;</div>
                  )}
                </div>
                <span className="badge bg-red-100 text-red-700 border-red-200 whitespace-nowrap">
                  {d.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input
                  className="input text-xs flex-1"
                  placeholder="Resolution note (optional)"
                  value={notesById[d.id] ?? ''}
                  onChange={(e) => setNotesById((s) => ({ ...s, [d.id]: e.target.value }))}
                />
                <button
                  disabled={resolvingId === d.id}
                  onClick={() => resolve(d.id)}
                  className="btn-secondary text-xs whitespace-nowrap"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
