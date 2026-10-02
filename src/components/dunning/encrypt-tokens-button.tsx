'use client';
import { useState } from 'react';

/** Admin only: encrypt the integration tokens already stored. Safe to press twice. */
export function EncryptTokensButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/encrypt-tokens', { method: 'POST' });
      const data = await res.json();
      setMsg(res.ok ? `Done: ${data.resaved} of ${data.total} connections re-saved encrypted.` : `Not done: ${data.error}`);
    } catch { setMsg('Not done: the request failed.'); }
    setBusy(false);
  }
  return (
    <div className="card-primary mb-6">
      <h2 className="app-heading">Encrypt stored tokens</h2>
      <p className="mt-1 text-sm text-ink-600">After INTEGRATION_TOKEN_KEY is set and the site redeployed, press this once so tokens already stored are saved encrypted.</p>
      <button type="button" onClick={run} disabled={busy} className="btn-secondary btn-sm mt-3">{busy ? 'Working…' : 'Encrypt now'}</button>
      {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}
