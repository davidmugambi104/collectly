'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Shown on Integrations when a disconnected Xero left data behind. Asks first, then removes it. */
export function RemoveImportedButton({ message }: { message: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm(`${message}\n\nRemove them? Reminders and payments recorded against those invoices go too. Anything you typed in yourself, and anything from QuickBooks, stays.`)) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/integrations/imported', { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError('Could not remove them. Try again.');
      setBusy(false);
    }
  }

  return (
    <div role="status" className="alert-danger mb-6">
      <p>{message}</p>
      <button type="button" onClick={remove} disabled={busy} className="btn-secondary btn-sm mt-2">{busy ? 'Removing…' : 'Remove them'}</button>
      {error && <p role="alert" className="mt-1 text-sm text-danger-900">{error}</p>}
    </div>
  );
}
