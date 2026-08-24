'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X } from 'lucide-react';

interface Customer { id: string; name: string; email: string | null; }

export function NewInvoiceForm({ customers, defaultCustomerId }: { customers: Customer[]; defaultCustomerId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<{ description: string; quantity: number; unitPrice: number }[]>([{ description: '', quantity: 1, unitPrice: 0 }]);

  const total = items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null);
    const form = new FormData(e.currentTarget);
    const data = {
      customerId: String(form.get('customerId') ?? ''),
      number: String(form.get('number') ?? `INV-${Date.now()}`),
      amount: String(total),
      currency: String(form.get('currency') ?? 'USD'),
      issueDate: String(form.get('issueDate') ?? new Date().toISOString().slice(0, 10)),
      dueDate: String(form.get('dueDate') ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)),
      description: items.map((i) => i.description).filter(Boolean).join('; '),
    };
    if (!data.customerId) { setError('Pick a customer'); setLoading(false); return; }
    try {
      const res = await fetch('/api/invoices', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      router.push('/dashboard/invoices');
      router.refresh();
    } catch (e: any) { setError(e.message); setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="card-lg max-w-2xl space-y-5">
      <h2 className="h3">New invoice</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Customer</label>
          <select name="customerId" required defaultValue={defaultCustomerId ?? ''} className="input">
            <option value="" disabled>Choose a customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Invoice number</label>
          <input name="number" defaultValue={`INV-${Date.now().toString().slice(-6)}`} className="input font-mono" required />
        </div>
        <div>
          <label className="label">Issue date</label>
          <input type="date" name="issueDate" defaultValue={new Date().toISOString().slice(0, 10)} className="input" required />
        </div>
        <div>
          <label className="label">Due date</label>
          <input type="date" name="dueDate" defaultValue={new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)} className="input" required />
        </div>
        <div>
          <label className="label">Currency</label>
          <select name="currency" className="input" defaultValue="USD">
            {['USD','GBP','AUD','CAD','EUR','KES','NGN','ZAR','INR'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Line items</label>
          <button type="button" onClick={() => setItems([...items, { description: '', quantity: 1, unitPrice: 0 }])} className="btn-ghost text-xs"><Plus className="h-3 w-3" />Add line</button>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input className="input col-span-7" placeholder="Description" value={item.description} onChange={(e) => setItems(items.map((it, j) => j === i ? { ...it, description: e.target.value } : it))} />
              <input className="input col-span-2" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => setItems(items.map((it, j) => j === i ? { ...it, quantity: Number(e.target.value) } : it))} />
              <input className="input col-span-2" type="number" min="0" step="0.01" placeholder="Unit price" value={item.unitPrice} onChange={(e) => setItems(items.map((it, j) => j === i ? { ...it, unitPrice: Number(e.target.value) } : it))} />
              <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="col-span-1 btn-ghost text-xs" disabled={items.length === 1}><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-3 text-sm">
          <span className="text-ink-500">Total:</span>
          <span className="font-mono font-bold text-lg">${total.toFixed(2)}</span>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex justify-end gap-2">
        <Link href="/dashboard/invoices" className="btn-secondary text-sm">Cancel</Link>
        <button disabled={loading} className="btn-primary text-sm">{loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Create invoice</button>
      </div>
    </form>
  );
}
