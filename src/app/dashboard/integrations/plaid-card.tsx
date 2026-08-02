'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';

/**
 * Plaid integration card.
 *
 * Plaid Link is a client-side widget (loaded from plaid.com's CDN). It opens
 * a bank-selection flow, returns a `public_token`, which we then POST to
 * /api/plaid/exchange for a long-lived `access_token`.
 *
 * If `react-plaid-link` is not installed, we fall back to a graceful
 * "configure your Plaid keys" state so the page never breaks in dev.
 */
declare global {
  interface Window {
    Plaid?: any;
  }
}

export function PlaidCard({ status }: { status: string }) {
  const connected = status === 'connected';
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handlerRef = useRef<any>(null);

  useEffect(() => {
    // Lazy-load the Plaid Link SDK (1.1.2) from CDN once.
    if (typeof window === 'undefined') return;
    if (window.Plaid) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    s.async = true;
    s.onerror = () => setError('Failed to load Plaid Link. Check your network or ad-blocker.');
    document.head.appendChild(s);
  }, []);

  async function openLink() {
    setError(null);
    setOpening(true);
    try {
      // 1) Get a link_token from the server
      const r = await fetch('/api/plaid/connect', { method: 'POST' });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed to create link token (HTTP ${r.status})`);
      }
      const { link_token } = await r.json();

      // 2) Wait for SDK to load
      if (!window.Plaid) {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('Plaid SDK load timeout')), 8000);
          const i = setInterval(() => {
            if (window.Plaid) {
              clearTimeout(t);
              clearInterval(i);
              resolve();
            }
          }, 100);
        });
      }

      // 3) Open Plaid Link
      handlerRef.current = window.Plaid.create({
        token: link_token,
        onSuccess: async (public_token: string) => {
          const ex = await fetch('/api/plaid/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_token }),
          });
          if (!ex.ok) {
            const j = await ex.json().catch(() => ({}));
            setError(j.error || `Exchange failed (HTTP ${ex.status})`);
            setOpening(false);
            return;
          }
          // Refresh server state and bounce back to integrations
          window.location.reload();
        },
        onExit: () => setOpening(false),
        onEvent: () => {},
      });
      handlerRef.current.open();
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setOpening(false);
    }
  }

  return (
    <div className={`card transition-colors ${connected ? 'border-emerald-200 bg-emerald-50/30' : ''}`}>
      <div className="flex items-start gap-3">
        <div
          className={`h-10 w-10 rounded-lg grid place-items-center font-display font-bold text-sm shrink-0 ${
            connected ? 'bg-emerald-600 text-white' : 'bg-ink-950 text-white'
          }`}
        >
          P
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-ink-900">Plaid</h3>
            {connected ? (
              <span className="badge-success text-[10px]">Connected</span>
            ) : (
              <span className="badge-neutral text-[10px]">Not connected</span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-600">Read-only bank connection. Balance/transaction sync isn't wired into the forecast yet — connecting saves your bank link for when it is.</p>
          {error && (
            <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
              {error}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={openLink}
              disabled={opening || connected}
              className={connected ? 'btn-secondary text-sm' : 'btn-primary text-sm'}
            >
              {opening ? 'Opening Plaid…' : connected ? 'Manage' : 'Connect'}
            </button>
            <a href="https://plaid.com/docs/link/" target="_blank" rel="noreferrer" className="btn-ghost text-sm">
              <BookOpen className="h-3.5 w-3.5" /> Docs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
