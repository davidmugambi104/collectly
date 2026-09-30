'use client';
import { useState } from 'react';
import { CalendarClock, Flag, Loader2, CheckCircle2 } from 'lucide-react';
import { PORTAL_REASONS, PROMISE_MAX_DAYS, MAX_NOTE_CHARS } from '@/lib/portal-self-service';

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * For the person paying: tell the business when you will pay, or that something
 * is wrong, without writing an email. Either one pauses the reminders.
 */
export function PortalHelp({ invoiceId, orgName }: { invoiceId: string; orgName: string }) {
  const [open, setOpen] = useState<'promise' | 'problem' | null>(null);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const today = new Date();
  const max = new Date(today.getTime() + PROMISE_MAX_DAYS * 86_400_000);

  async function send(kind: 'promise' | 'dispute') {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/pay/${invoiceId}/${kind}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(kind === 'promise' ? { date } : { reason, message: note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.');
      setDone(kind === 'promise'
        ? `Thank you. We have let ${orgName} know you will pay by ${new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}. You will not get reminders before then.`
        : `Thank you. We have told ${orgName}, and reminders are paused while they look into it.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="card" role="status">
        <p className="flex items-start gap-2 text-sm text-ink-800"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{done}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="font-semibold text-ink-900">Can&apos;t pay right now?</h2>
      <p className="mt-1 text-sm text-ink-600">Tell {orgName} and they will pause the reminders. No email needed.</p>

      <div className="mt-3 space-y-2">
        <button type="button" className="btn-secondary w-full justify-start text-sm" aria-expanded={open === 'promise'} onClick={() => { setOpen(open === 'promise' ? null : 'promise'); setError(null); }}>
          <CalendarClock aria-hidden="true" className="h-4 w-4" /> I will pay on a set day
        </button>
        {open === 'promise' && (
          <div className="rounded-lg border border-ink-200 p-3">
            <label htmlFor="pp-date" className="label">Which day?</label>
            <input id="pp-date" type="date" className="input" min={iso(today)} max={iso(max)} value={date} onChange={(e) => setDate(e.target.value)} />
            <p className="mt-1 text-xs text-ink-500">Up to {PROMISE_MAX_DAYS} days from today.</p>
            <button type="button" className="btn-primary btn-sm mt-3" disabled={!date || busy} aria-busy={busy} onClick={() => send('promise')}>
              {busy && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Tell {orgName}
            </button>
          </div>
        )}

        <button type="button" className="btn-secondary w-full justify-start text-sm" aria-expanded={open === 'problem'} onClick={() => { setOpen(open === 'problem' ? null : 'problem'); setError(null); }}>
          <Flag aria-hidden="true" className="h-4 w-4" /> Something is not right
        </button>
        {open === 'problem' && (
          <div className="rounded-lg border border-ink-200 p-3">
            <label htmlFor="pp-reason" className="label">What is it?</label>
            <select id="pp-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Choose one</option>
              {PORTAL_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <label htmlFor="pp-note" className="label mt-3">Anything to add? (optional)</label>
            <textarea id="pp-note" className="input min-h-[80px]" maxLength={MAX_NOTE_CHARS} value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="button" className="btn-primary btn-sm mt-3" disabled={!reason || busy} aria-busy={busy} onClick={() => send('dispute')}>
              {busy && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Send to {orgName}
            </button>
          </div>
        )}
        {error && <div role="alert" className="text-sm text-red-700">{error}</div>}
      </div>
    </div>
  );
}
