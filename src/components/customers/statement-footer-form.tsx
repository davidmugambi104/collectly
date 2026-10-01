'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/** The payment details printed at the bottom of every statement: bank account, how to pay, terms. */
export function StatementFooterForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/dunning/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ statementFooter: text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setMsg({ kind: 'ok', text: text.trim() ? 'Saved. It will show at the bottom of every statement.' : 'Cleared.' });
      router.refresh();
    } catch (e: unknown) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(false); }
  }

  return (
    <section className="card mt-4 print:hidden" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="app-heading">How customers pay you</h2>
      <p className="app-meta mt-1 font-normal">Printed at the bottom of every statement you send or print: bank account, payment link, terms. Useful for late fees, which are not on the payment page.</p>
      {msg && <div role={msg.kind === 'err' ? 'alert' : 'status'} className={`${msg.kind === 'err' ? 'alert-danger' : 'alert-success'} mt-3`}>{msg.text}</div>}
      <label htmlFor="statement-footer" className="label mt-3">Payment details or terms</label>
      <textarea id="statement-footer" className="input min-h-[90px]" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={'e.g. Pay by bank transfer to Acme Ltd, account 0123456789.\nPlease quote the invoice number.'} />
      <div className="mt-2">
        <button type="button" className="btn-secondary btn-sm" disabled={busy} aria-busy={busy} onClick={save}>
          {busy && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Save
        </button>
      </div>
    </section>
  );
}
