'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROVIDER_LABEL, type ImportProvider, type ImportedSummary } from '@/lib/integrations/imported-data';

/**
 * Shown on Integrations when a disconnected Xero or QuickBooks left data behind. Two steps: it shows the preview
 * (counts and sample names), then asks for a second click. The server re-counts and refuses if the numbers moved.
 */
export function RemoveImportedButton({ provider, summary, message }: { provider: ImportProvider; summary: ImportedSummary; message: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'notice' | 'confirm'>('notice');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = PROVIDER_LABEL[provider];

  async function remove() {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/integrations/imported', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider, expect: { invoices: summary.invoices, customers: summary.customers } }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.error === 'string' ? j.error : 'Could not remove them. Try again.');
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove them. Try again.');
      setBusy(false);
    }
  }

  return (
    <div role="status" className="alert-danger mb-6">
      <p>{message}</p>
      {step === 'notice' ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setStep('confirm')} className="btn-secondary btn-sm">Review and remove</button>
          <a className="link text-sm" href="/api/account/export">Download everything first (ZIP)</a>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm">
            This removes {summary.invoices} invoice{summary.invoices === 1 ? '' : 's'} and {summary.customers} customer{summary.customers === 1 ? '' : 's'}
            {summary.sampleCustomers.length > 0 && <> (for example {summary.sampleCustomers.slice(0, 5).join(', ')})</>}.
            Reminders and payments recorded against those invoices go too. Anything you typed in yourself, and anything from another provider, stays. It cannot be undone.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" onClick={remove} disabled={busy} className="btn-secondary btn-sm">{busy ? 'Removing…' : `Remove the ${label} data`}</button>
            <button type="button" onClick={() => setStep('notice')} disabled={busy} className="link text-sm">Cancel</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-1 text-sm text-danger-900">{error}</p>}
    </div>
  );
}
