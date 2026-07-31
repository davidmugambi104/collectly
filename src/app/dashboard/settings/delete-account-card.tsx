'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Trash2 } from 'lucide-react';

/**
 * Danger Zone card on /dashboard/settings. Lets the user wipe their tenant.
 *
 * Deletion flow:
 *   1. User clicks "Delete account"
 *   2. Modal opens, user must retype the org name exactly
 *   3. POST /api/account/delete with { confirm }
 *   4. Server cascades through the application data + Clerk org
 *   5. Client redirects to /sign-in (Clerk session has no active org)
 *
 * We intentionally do NOT use a server action for this. Server actions
 * mutate in place; a destructive operation should have a clear URL
 * boundary, JSON contract, and a single response shape we can audit.
 */

export function DeleteAccountCard({ orgName }: { orgName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setConfirm('');
    setError(null);
  }

  function close() {
    if (pending) return;
    reset();
    setOpen(false);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm }),
      });
      if (res.ok) {
        // Force Clerk to refresh its session/org state before redirect.
        router.push('/sign-in');
        router.refresh();
        return;
      }
      let msg = 'Deletion failed';
      try {
        const j = await res.json();
        if (typeof j?.error === 'string') msg = j.error;
      } catch {
        // keep default
      }
      setError(msg);
    });
  }

  const matches = confirm.trim() === orgName.trim();

  return (
    <div className="card max-w-2xl border-red-200 bg-red-50/40">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-9 w-9 rounded-lg bg-red-100 text-red-700 grid place-items-center shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-ink-900">Delete account</h3>
          <p className="text-sm text-ink-700 mt-1">
            Permanently deletes the workspace <strong>{orgName}</strong>, all
            customers, invoices, payments, dunning history, and integrations.
            This cannot be undone.
          </p>
          <p className="text-xs text-ink-600 mt-2">
            See our{' '}
            <a href="/privacy" className="underline">
              privacy notice
            </a>{' '}
            for the data we hold and how long backups persist.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 active:scale-[0.98] disabled:opacity-60"
              disabled={pending}
            >
              <Trash2 className="h-4 w-4" />
              Delete account
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink-950/50 flex items-center justify-center p-4"
          onClick={close}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-ink-900">
              Delete <span className="font-mono">{orgName}</span>?
            </h2>
            <p className="text-sm text-ink-700 mt-2">
              Type the workspace name exactly to confirm. We&apos;ll remove the
              application data and the associated Clerk organization.
            </p>
            <input
              autoFocus
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={orgName}
              className="mt-4 w-full px-3 py-2 rounded-lg border border-ink-200 focus:border-ink-400 outline-none text-sm"
              disabled={pending}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="px-4 py-2 rounded-lg bg-white text-ink-900 border border-ink-200 hover:border-ink-300 hover:bg-ink-50 text-sm font-medium disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!matches || pending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 active:scale-[0.98] disabled:opacity-60"
              >
                {pending ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}