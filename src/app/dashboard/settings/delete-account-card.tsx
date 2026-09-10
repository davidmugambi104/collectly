'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Trash2, Check } from 'lucide-react';

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
 *
 * Visual weighting: the card is a normal white surface with a danger edge and
 * a danger glyph — not a red panel. A permanently red block on a settings page
 * is background noise within a week, and noise is the opposite of caution. The
 * weight is spent where the decision actually happens: a small, quiet trigger,
 * then a modal that names the consequences and will not arm its button until
 * the workspace name has been typed back.
 */

/* No `.btn-danger` token exists yet, so the danger fill is composed here from
   the same light model the other buttons use: a catchlight on the top edge and
   a short shadow that grows on hover. */
const DANGER_BTN =
  'btn bg-danger-600 text-white transition-all duration-150 hover:bg-danger-700 ' +
  '[box-shadow:inset_0_1px_0_0_rgb(255_255_255/0.16),var(--lift-1)] ' +
  'hover:[box-shadow:inset_0_1px_0_0_rgb(255_255_255/0.16),var(--lift-2)] ' +
  'disabled:opacity-50 disabled:[box-shadow:none]';

// What deletion actually takes with it. Enumerated rather than run into a
// sentence: five nouns in a row read as one blur, five items read as five.
const WIPED = ['Customers', 'Invoices', 'Payments', 'Dunning history', 'Integrations'];

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

  // Escape closes the dialog — expected of anything modal, and the only way out
  // for a keyboard user who opened it by accident.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) {
        reset();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, pending]);

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
    <div className="card relative">
      {/* Severity as a 3px edge. `.row-urgent` would be erased here: `.card`
          declares the `border` shorthand, which resets border-left. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-danger-500" />

      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger-50 text-danger-600 ring-1 ring-danger-100"
        >
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="app-heading">Delete account</h2>
          <p className="app-body mt-1">
            Permanently deletes the workspace <strong className="font-semibold text-ink-950">{orgName}</strong> and
            everything in it. This cannot be undone.
          </p>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {WIPED.map((item) => (
              <li key={item} className="badge-neutral">{item}</li>
            ))}
          </ul>

          <p className="app-meta mt-3 font-normal">
            See our{' '}
            <a href="/privacy" className="text-brand-600 underline underline-offset-2 hover:text-brand-700">
              privacy notice
            </a>{' '}
            for the data we hold and how long backups persist.
          </p>

          {/* Small and quiet on purpose: the inverse of Fitts, since nobody
              should reach this by momentum. */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(true);
              }}
              className={`${DANGER_BTN} btn-sm`}
              disabled={pending}
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              Delete account
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          className="scrim z-50 flex items-center justify-center p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            aria-describedby="delete-account-desc"
            className="w-full max-w-md animate-settle rounded-2xl border bg-white p-6 [border-color:var(--hair)] lift-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger-50 text-danger-600 ring-1 ring-danger-100"
              >
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 id="delete-account-title" className="app-title">
                  Delete <span className="font-mono">{orgName}</span>?
                </h2>
                <p id="delete-account-desc" className="app-body mt-1.5">
                  Type the workspace name exactly to confirm. We&apos;ll remove the
                  application data and the associated Clerk organization.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="delete-account-confirm" className="label">Workspace name</label>
              <input
                id="delete-account-confirm"
                autoFocus
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={orgName}
                autoComplete="off"
                spellCheck={false}
                aria-describedby="delete-account-match"
                className="input font-mono"
                disabled={pending}
              />
              {/* Confirmation of the one thing standing between the user and an
                  irreversible action, so it is stated rather than left to the
                  button's disabled state to imply. */}
              <p id="delete-account-match" role="status" className="app-meta mt-1.5 min-h-4 font-normal">
                {matches ? (
                  <span className="inline-flex items-center gap-1 text-success-700">
                    <Check aria-hidden="true" className="h-3 w-3" />Name matches
                  </span>
                ) : confirm.length > 0 ? (
                  'Not an exact match yet.'
                ) : null}
              </p>
            </div>

            {error && (
              <p role="alert" className="alert-danger mt-2">{error}</p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="btn-secondary w-full justify-center sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!matches || pending}
                aria-busy={pending}
                className={`${DANGER_BTN} w-full justify-center sm:w-auto`}
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
