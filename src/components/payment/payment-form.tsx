'use client';
import { useState } from 'react';
import { CheckCircle2, Lock, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

export function PaymentForm({ amount, currency, invoiceNumber, invoiceId, orgSlug }: { amount: number; currency: string; invoiceNumber: string; invoiceId: string; orgSlug: string }) {
  const [method, setMethod] = useState<'card' | 'ach' | 'wire'>('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (method === 'wire') {
      // Wire transfers can't be initiated online — surface instructions
      window.location.href = `mailto:${orgSlug}@collectly.app?subject=Wire transfer for invoice ${invoiceNumber}`;
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payment/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, method }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Could not start checkout');
        setLoading(false);
        return;
      }
      if (data.url) {
        // Redirect to Stripe-hosted checkout
        window.location.href = data.url;
        return;
      }
      setError('Checkout session missing redirect URL');
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Payment setup failed</div>
            <div className="mt-1">{error}</div>
            <div className="mt-2 text-xs text-red-600">
              If this persists, contact <a href={`mailto:${orgSlug}@collectly.app`} className="underline">{orgSlug}@collectly.app</a>.
            </div>
          </div>
        </div>
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
          >{m === 'ach' ? 'ACH' : m === 'wire' ? 'Wire' : 'Card'}</button>
        ))}
      </div>

      {method === 'card' && (
        <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-4 text-sm text-ink-700">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 mt-0.5 flex-shrink-0 text-ink-500" />
            <div>
              You'll be redirected to a secure Stripe page to enter your card details. We never see or store your card number.
            </div>
          </div>
        </div>
      )}

      {method === 'ach' && (
        <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-4 text-sm text-ink-700">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 mt-0.5 flex-shrink-0 text-ink-500" />
            <div>
              ACH transfers are processed by Stripe. You'll enter your bank routing and account number on their secure page. ACH typically settles in 3-5 business days.
            </div>
          </div>
        </div>
      )}

      {method === 'wire' && (
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm space-y-1.5">
          <div className="font-semibold text-ink-900">Wire transfer</div>
          <div className="text-ink-600 text-xs">Clicking Pay will open an email to the business requesting wire instructions. Wire transfers cannot be initiated online.</div>
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full text-base h-12">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {method === 'wire' ? 'Request wire instructions' : `Continue to secure payment · ${currency} ${amount.toFixed(2)}`}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-xs text-ink-500">
        <ShieldCheck className="h-3.5 w-3.5" /> Powered by Stripe · PCI DSS Level 1
      </div>
    </form>
  );
}
