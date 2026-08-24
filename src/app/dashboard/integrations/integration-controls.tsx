'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Unlink, Loader2 } from 'lucide-react';

/**
 * Inline controls for an already-connected accounting integration.
 * Provides:
 *  - "Sync now" — POST /api/integrations/sync, refreshes the page on success
 *  - "Disconnect" — DELETE /api/integrations/sync with confirmation
 */
export function IntegrationControls({ provider, label, lastSyncAt }: { provider: 'quickbooks' | 'xero' | 'square'; label: string; lastSyncAt?: string | null }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
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
      if (!res.ok) throw new Error(data?.error ?? 'sync failed');
      setSyncResult(
        `Imported ${data.customersUpserted} customers, ${data.invoicesUpserted} invoices` +
          (data.invoicesMarkedPaid ? ` (${data.invoicesMarkedPaid} marked paid)` : '') +
          ` in ${data.durationMs}ms`,
      );
      router.refresh();
    } catch (e: unknown) {
      setSyncResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  const onDisconnect = async () => {
    if (!confirm(`Disconnect ${label}? This will remove the connection and stop future syncs. You can reconnect at any time.`)) return;
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
          Disconnect
        </button>
        {lastSyncAt && (
          <span className="text-xs text-ink-500">Last sync {new Date(lastSyncAt).toLocaleString()}</span>
        )}
      </div>
      {syncResult && <p className="text-xs text-ink-600">{syncResult}</p>}
    </div>
  );
}
