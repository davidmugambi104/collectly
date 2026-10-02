'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pause, Play } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type Hold = { heldUntil: string | null; reason: string | null } | null;

/**
 * Owner's switch for automatic reminders to one customer. It only affects the
 * scheduler. A customer who unsubscribed stays unsubscribed either way: that is
 * a separate compliance flag this panel never touches. Manual sends from the
 * composer still work while a hold is on.
 */
export function HoldPanel({ customerId, customerName, hold }: { customerId: string; customerName: string; hold: Hold }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  async function pause(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/customers/${customerId}/hold`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          heldUntil: (form.get('heldUntil') as string) || null,
          reason: (form.get('reason') as string) || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not pause reminders');
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/hold`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not resume reminders');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section" aria-labelledby="hold-heading">
      <div className="section-head">
        <div>
          <h2 id="hold-heading" className="app-heading">Automatic reminders</h2>
          <p className="app-meta mt-0.5 font-normal">
            {hold
              ? <>Paused for {customerName}{hold.heldUntil ? <> until {formatDate(hold.heldUntil)}</> : <> until you resume</>}. Nothing goes out automatically{hold.reason ? <>. Note: {hold.reason}</> : null}.</>
              : <>On for {customerName}. Pause them if you have already spoken, or the customer needs a personal touch.</>}
          </p>
        </div>
        {hold ? (
          <button className="btn-secondary btn-sm" onClick={resume} disabled={busy} aria-busy={busy}>
            {busy ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Play aria-hidden="true" className="h-3.5 w-3.5" />}
            Resume reminders
          </button>
        ) : (
          <button className="btn-secondary btn-sm" aria-expanded={open} aria-controls="hold-form" onClick={() => setOpen((v) => !v)}>
            {open ? 'Cancel' : <><Pause aria-hidden="true" className="h-3.5 w-3.5" />Pause reminders</>}
          </button>
        )}
      </div>

      {open && !hold && (
        <form id="hold-form" onSubmit={pause} className="subform mb-3 animate-rise">
          <fieldset className="m-0 w-full min-w-0 space-y-3 border-0 p-0">
            <legend className="app-label mb-1">Pause automatic reminders</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="hold-until" className="label">
                  Until <span className="ml-1 font-normal text-ink-500">Optional</span>
                </label>
                <input id="hold-until" name="heldUntil" type="date" min={today} className="input" />
                <p className="mt-1 text-xs text-ink-500">Leave empty to pause until you resume.</p>
              </div>
              <div>
                <label htmlFor="hold-reason" className="label">
                  Note <span className="ml-1 font-normal text-ink-500">Optional</span>
                </label>
                <input id="hold-reason" name="reason" maxLength={200} className="input" placeholder="e.g. agreed a payment plan on the phone" />
              </div>
            </div>
            {error && <div role="alert" className="alert-danger">{error}</div>}
            <div className="flex items-center justify-end gap-1 border-t border-ink-200 pt-3">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm">Cancel</button>
              <button disabled={busy} aria-busy={busy} className="btn-primary btn-sm">
                {busy && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Pause reminders
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {(!open || hold) && error && <div role="alert" className="alert-danger">{error}</div>}
    </section>
  );
}
