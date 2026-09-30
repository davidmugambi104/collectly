'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';

type PresetView = { id: string; name: string; blurb: string };

/**
 * Shown until the account has its first reminder. Picks a starter schedule and
 * drafts reminders for whatever is already overdue. Drafts only: the first
 * batch always waits in the approval queue below.
 */
export function StarterSetup({ presets, approvalRequired }: { presets: PresetView[]; approvalRequired: boolean }) {
  const router = useRouter();
  const [choice, setChoice] = useState('standard');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function go() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/dunning/first-run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ preset: choice }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      const n: number = data.drafted ?? 0;
      setMsg({
        kind: 'ok',
        text: n === 0
          ? 'Your schedule is set. No invoices are overdue yet, so there is nothing to draft. Reminders will be drafted as invoices go past due.'
          : `${n} reminder${n === 1 ? ' is' : 's are'} drafted and waiting in the approval queue. Nothing has been sent.${data.capped ? ' That is the first batch; the daily run drafts the rest.' : ''}`,
      });
      setDone(true); // refreshing now would drop this card, and the message with it
    } catch (e: unknown) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(false); }
  }

  return (
    <section className="card-primary mb-6" aria-labelledby="starter-heading">
      <div className="flex items-start gap-3">
        <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        <div className="min-w-0 flex-1">
          <h2 id="starter-heading" className="app-heading">Start with a schedule</h2>
          <p className="app-meta mt-0.5 font-normal">
            Pick one. Mugavi drafts a reminder for each invoice that is already overdue. {approvalRequired
              ? 'You read and approve each one before it goes out.'
              : 'These first drafts wait for you to approve them. Approval is off in your settings, so later reminders will go out on their own.'}
          </p>
          <fieldset className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" disabled={busy || done}>
            <legend className="sr-only">Starter schedule</legend>
            {presets.map((p) => (
              <label key={p.id} className={`cursor-pointer rounded-lg border p-3 text-sm ${choice === p.id ? 'border-brand-500 ring-1 ring-brand-500' : 'border-ink-200'}`}>
                <input type="radio" name="starter-preset" className="sr-only" checked={choice === p.id} onChange={() => setChoice(p.id)} />
                <span className="block font-medium text-ink-900">{p.name}</span>
                <span className="mt-1 block text-ink-600">{p.blurb}</span>
              </label>
            ))}
          </fieldset>
          {!done && (
            <div className="mt-3 flex items-center gap-3">
              <button className="btn-primary btn-sm" onClick={go} disabled={busy} aria-busy={busy}>
                {busy && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Use this and draft my reminders
              </button>
              <span className="app-meta font-normal">You can change any step afterwards.</span>
            </div>
          )}
          {msg && <div role={msg.kind === 'err' ? 'alert' : 'status'} className={`mt-3 ${msg.kind === 'err' ? 'alert-danger' : 'text-sm text-success-700'}`}>{msg.text}</div>}
          {done && <button className="btn-primary btn-sm mt-3" onClick={() => router.refresh()}>Show the drafts</button>}
        </div>
      </div>
    </section>
  );
}
