'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Unlink, Loader2 } from 'lucide-react';
import { errorMessage } from '@/lib/utils';

/**
 * Inline controls for an already-connected accounting integration.
 * Provides:
 *  - "Sync now" — POST /api/integrations/sync, refreshes the page on success
 *  - "Disconnect from QuickBooks" / "Disconnect from Xero": DELETE /api/integrations/sync with confirmation
 */
export function IntegrationControls({ provider, label, lastSyncAt }: { provider: string; label: string; lastSyncAt?: string | null }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncHadErrors, setSyncHadErrors] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const onSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) {
        // The API puts the useful reason in `details`; showing only "sync failed" hid it.
        const why = Array.isArray(data?.details) && data.details.length > 0 ? `: ${String(data.details[0]).slice(0, 240)}` : '';
        throw new Error(`${data?.error ?? 'sync failed'}${why}`);
      }
      // The API can return ok:true with a non-empty `errors` array — e.g.
      // customers imported fine but the invoice fetch itself failed, or a
      // handful of rows were individually malformed. That used to be
      // silently dropped here: the message only ever showed the upsert
      // counts, so a partially-failed sync looked identical to a clean one.
      const errorCount = Array.isArray(data.errors) ? data.errors.length : 0;
      setSyncHadErrors(errorCount > 0);
      setSyncResult(
        `Imported ${data.customersUpserted} customers, ${data.invoicesUpserted} invoices` +
          (data.invoicesMarkedPaid ? ` (${data.invoicesMarkedPaid} marked paid)` : '') +
          ` in ${data.durationMs}ms` +
          (errorCount > 0 ? `. ${errorCount} error${errorCount === 1 ? '' : 's'}: ${data.errors.slice(0, 3).join('; ')}${errorCount > 3 ? '…' : ''}` : ''),
      );
      router.refresh();
    } catch (e: unknown) {
      setSyncHadErrors(true);
      setSyncResult(`Error: ${errorMessage(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  const onDisconnect = async () => {
    if (!confirm(`Disconnect ${label}? Mugavi asks ${label} to revoke its access, deletes the stored tokens and stops syncing. Customers and invoices already imported stay in Mugavi until you delete them or delete your account. You can reconnect at any time.`)) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/integrations/sync?provider=${provider}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Disconnect failed: ${data?.error ?? res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onSync}
          disabled={syncing || disconnecting}
          className="btn-secondary text-sm disabled:opacity-50"
          type="button"
        >
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
        <button
          onClick={onDisconnect}
          disabled={syncing || disconnecting}
          className="btn-ghost text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
          type="button"
        >
          {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
          {provider === 'square' ? 'Disconnect' : `Disconnect from ${label}`}
        </button>
        {lastSyncAt && (
          <span className="text-xs text-ink-500">Last sync {new Date(lastSyncAt).toLocaleString()}</span>
        )}
      </div>
      {syncing && <p role="status" className="text-xs text-ink-600">Syncing your books. Keep this page open until it says it is done. Nothing is sent to anyone.</p>}
      {syncResult && <p className={`text-xs ${syncHadErrors ? 'text-red-600' : 'text-ink-600'}`}>{syncResult}</p>}
      {syncResult && !syncHadErrors && (
        <a href="/dashboard/dunning#starter-heading" className="btn-primary btn-sm w-fit">Next: draft your first reminders</a>
      )}
    </div>
  );
}
