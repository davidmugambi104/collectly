'use client';
import { useState } from 'react';
import { CheckCircle2, Lock, ShieldCheck, Loader2 } from 'lucide-react';

export function PaymentForm({ amount, currency, invoiceNumber, onPaid }: { amount: number; currency: string; invoiceNumber: string; onPaid?: () => void }) {
  const [method, setMethod] = useState<'card' | 'ach' | 'wire'>('card');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setDone(true);
    onPaid?.();
  }

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="h-14 w-14 mx-auto rounded-full bg-emerald-50 grid place-items-center">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="mt-4 text-xl font-display font-semibold text-ink-950">Payment received</h2>
        <p className="mt-2 text-sm text-ink-600">Thank you. A receipt has been emailed to you.</p>
        <p className="mt-1 text-xs text-ink-500 font-mono">Invoice #{invoiceNumber} · {currency} {amount.toFixed(2)}</p>
      </div>
    );
  }

  return (
    <form onSubmit={pay} className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(['card','ach','wire'] as const).map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => setMethod(m)}
            className={`rounded-lg border px-3 py-2.5 text-sm font-medium capitalize transition-colors ${method === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-700 hover:border-ink-300'}`}
          >{m}</button>
        ))}
      </div>

      {method === 'card' && (
        <div className="space-y-3">
          <div>
            <label className="label">Card number</label>
            <input required placeholder="4242 4242 4242 4242" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Expiry</label>
              <input required placeholder="MM/YY" className="input" />
            </div>
            <div>
              <label className="label">CVC</label>
              <input required placeholder="123" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Name on card</label>
            <input required placeholder="Your name" className="input" />
          </div>
        </div>
      )}

      {method === 'ach' && (
        <div className="space-y-3">
          <div>
            <label className="label">Bank account number</label>
            <input required placeholder="000123456789" className="input font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Routing number</label>
              <input required placeholder="021000021" className="input font-mono" />
            </div>
            <div>
              <label className="label">Account type</label>
              <select className="input"><option>Checking</option><option>Savings</option></select>
            </div>
          </div>
        </div>
      )}

      {method === 'wire' && (
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm space-y-1.5">
          <div className="font-semibold text-ink-900">Wire instructions</div>
          <div className="font-mono text-xs text-ink-700">
            Bank: First Republic<br/>
            Account: ****6789<br/>
            Routing: 021000089<br/>
            Reference: Invoice {invoiceNumber}
          </div>
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full text-base h-12">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        Pay {currency} {amount.toFixed(2)}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-xs text-ink-500">
        <ShieldCheck className="h-3.5 w-3.5" /> Encrypted via Stripe · PCI DSS Level 1
      </div>
    </form>
  );
}
