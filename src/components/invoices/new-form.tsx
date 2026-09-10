'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X } from 'lucide-react';

interface Customer { id: string; name: string; email: string | null; }

/* Named field groups, same construction as the new-customer form: a titled
   group on the left, its fields on the right, one hairline between groups. A
   nine-field invoice form as one undifferentiated grid gives the eye no order
   to work in — and the line items, which are the actual substance, looked like
   just another field. */
function Section({
  title, hint, children,
}: {
  title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="grid gap-x-8 gap-y-3 border-t border-ink-100 py-5 first:border-t-0 first:pt-0 md:grid-cols-[190px_minmax(0,1fr)]">
      <div>
        <h3 className="app-label">{title}</h3>
        {hint && <p className="app-meta mt-1 font-normal">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

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
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="panel max-w-3xl">
      <div className="px-6 pt-6">
        <Section title="Bill to" hint="Who owes this, and under which reference.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="inv-customer" className="label">Customer</label>
              <select id="inv-customer" name="customerId" required defaultValue={defaultCustomerId ?? ''} className="input">
                <option value="" disabled>Choose a customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="inv-number" className="label">Invoice number</label>
              {/* Mono, because it is an identifier the customer will quote back. */}
              <input id="inv-number" name="number" defaultValue={`INV-${Date.now().toString().slice(-6)}`} className="input font-mono" required />
            </div>
          </div>
        </Section>

        <Section title="Terms" hint="The due date drives when dunning starts.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="inv-issue" className="label">Issue date</label>
              <input id="inv-issue" type="date" name="issueDate" defaultValue={new Date().toISOString().slice(0, 10)} className="input" required />
            </div>
            <div>
              <label htmlFor="inv-due" className="label">Due date</label>
              <input id="inv-due" type="date" name="dueDate" defaultValue={new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)} className="input" required />
            </div>
            <div>
              <label htmlFor="inv-currency" className="label">Currency</label>
              <select id="inv-currency" name="currency" className="input" defaultValue="USD">
                {['USD','GBP','AUD','CAD','EUR','KES','NGN','ZAR','INR'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </Section>

        <Section title="Line items" hint="The total is the sum of these lines.">
          {/* Column headers, so the three narrow inputs stop being anonymous
              boxes. Each input keeps its own accessible name for screen readers
              and for the case where the header row is off-screen on a phone. */}
          <div className="hidden grid-cols-12 gap-2 px-1 pb-1.5 sm:grid">
            <div className="app-meta col-span-5">Description</div>
            <div className="app-meta col-span-2">Qty</div>
            <div className="app-meta col-span-2">Unit price</div>
            <div className="app-meta col-span-2 text-right">Amount</div>
            <div className="col-span-1" />
          </div>

          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-12">
                <input
                  className="input col-span-2 sm:col-span-5"
                  placeholder="Description"
                  aria-label={`Line ${i + 1} description`}
                  value={item.description}
                  onChange={(e) => setItems(items.map((it, j) => j === i ? { ...it, description: e.target.value } : it))}
                />
                <input
                  className="input num col-span-1 sm:col-span-2"
                  type="number" min="1" placeholder="Qty"
                  aria-label={`Line ${i + 1} quantity`}
                  value={item.quantity}
                  onChange={(e) => setItems(items.map((it, j) => j === i ? { ...it, quantity: Number(e.target.value) } : it))}
                />
                <input
                  className="input num col-span-1 sm:col-span-2"
                  type="number" min="0" step="0.01" placeholder="Unit price"
                  aria-label={`Line ${i + 1} unit price`}
                  value={item.unitPrice}
                  onChange={(e) => setItems(items.map((it, j) => j === i ? { ...it, unitPrice: Number(e.target.value) } : it))}
                />
                {/* The line's own amount, computed. Watching a number appear as
                    you type is what makes the total believable. */}
                <output className="num col-span-1 pr-1 text-right text-[13px] text-ink-700 sm:col-span-2">
                  {(item.quantity * item.unitPrice).toFixed(2)}
                </output>
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                  className="btn-ghost btn-sm col-span-1 justify-self-end px-2 text-ink-500 hover:bg-danger-50 hover:text-danger-700"
                  disabled={items.length === 1}
                  aria-label={`Remove line ${i + 1}`}
                  title={items.length === 1 ? 'An invoice needs at least one line' : 'Remove line'}
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setItems([...items, { description: '', quantity: 1, unitPrice: 0 }])}
            className="btn-ghost btn-sm mt-2 -ml-2.5 text-brand-700 hover:bg-brand-50"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />Add line
          </button>
        </Section>
      </div>

      {/* The total is what the whole form produces, so it gets the recessed
          shelf immediately above the commit — the last thing read before the
          click, and set in tabular figures rather than mono. */}
      <div className="flex items-baseline justify-between gap-4 border-t border-ink-200/70 bg-ink-50/70 px-6 py-3.5">
        <span className="app-label">Invoice total</span>
        <span className="num-strong text-xl tracking-[-0.02em]">${total.toFixed(2)}</span>
      </div>

      {error && <div role="alert" className="alert-danger mx-6 my-4">{error}</div>}

      <div className="flex flex-col-reverse gap-2 border-t border-ink-200/70 bg-ink-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
        <Link href="/dashboard/invoices" className="btn-ghost w-full justify-center sm:w-auto">Cancel</Link>
        <button disabled={loading} aria-busy={loading} className="btn-primary w-full justify-center sm:w-auto">
          {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Create invoice
        </button>
      </div>
    </form>
  );
}
