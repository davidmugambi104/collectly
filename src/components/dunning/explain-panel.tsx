'use client';
import { useState } from 'react';
import { Loader2, HelpCircle, CheckCircle2, PauseCircle, Clock, Info } from 'lucide-react';

type Finding = { level: 'blocked' | 'waiting' | 'note' | 'ok'; text: string };
type Result = { willAct: boolean; headline: string; findings: Finding[] };
const ICON = { ok: CheckCircle2, blocked: PauseCircle, waiting: Clock, note: Info } as const;

/** Answers "why hasn't a reminder gone out for this invoice?" from the same rules the scheduler uses. */
export function ExplainPanel({ invoiceId }: { invoiceId: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/dunning/explain?invoiceId=${encodeURIComponent(invoiceId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not check');
      setResult(data);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return (
    <section className="section" aria-labelledby="explain-heading">
      <div className="section-head">
        <div>
          <h2 id="explain-heading" className="app-heading">Why hasn&apos;t a reminder gone out?</h2>
          <p className="app-meta mt-0.5 font-normal">Checks this invoice against your schedule, pauses, replies and send window.</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={run} disabled={busy} aria-busy={busy}>
          {busy ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />}Check
        </button>
      </div>
      {error && <div role="alert" className="alert-danger">{error}</div>}
      {result && (
        <div className="mt-2" role="status">
          <p className="text-sm font-medium text-ink-900">{result.headline}</p>
          <ul className="mt-2 space-y-1.5">
            {result.findings.map((f, i) => {
              const Icon = ICON[f.level];
              return <li key={i} className="flex items-start gap-2 text-sm text-ink-700"><Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${f.level === 'blocked' ? 'text-danger-600' : f.level === 'waiting' ? 'text-warn-600' : f.level === 'ok' ? 'text-success-600' : 'text-ink-500'}`} />{f.text}</li>;
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
