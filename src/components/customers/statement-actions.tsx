'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Loader2, Mail, Printer, Undo2 } from 'lucide-react';
import { useSendHold } from '@/components/dunning/use-send-hold';

/**
 * Print, download, and email a statement. Emailing waits 30 seconds with an Undo,
 * like every other message sent by hand, and the statement is rebuilt from the
 * invoices at the moment it goes, not at the moment of the click.
 */
export function StatementActions({ customerId, customerName, email, blockedReason }: { customerId: string; customerName: string; email: string | null; blockedReason: string | null }) {
  const router = useRouter();
  const hold = useSendHold();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const left = hold.secondsLeft(customerId);
  const holding = left !== null;

  async function send() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/statement`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setMsg({ kind: 'ok', text: `Statement sent to ${email}.` });
      setNote('');
      router.refresh();
    } catch (e: unknown) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(false); }
  }

  return (
    <section className="card print:hidden" aria-labelledby="send-statement-heading">
      <h2 id="send-statement-heading" className="app-heading">Send or keep a copy</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary btn-sm" onClick={() => window.print()}><Printer aria-hidden="true" className="h-3.5 w-3.5" />Print</button>
        <a className="btn-secondary btn-sm" href={`/api/customers/${customerId}/statement?format=csv`}><Download aria-hidden="true" className="h-3.5 w-3.5" />Download CSV</a>
      </div>

      {msg && <div role={msg.kind === 'err' ? 'alert' : 'status'} className={`${msg.kind === 'err' ? 'alert-danger' : 'alert-success'} mt-3`}>{msg.text}</div>}

      {blockedReason ? (
        <p className="app-meta mt-3 font-normal">{blockedReason}</p>
      ) : (
        <div className="mt-4">
          <label htmlFor="statement-note" className="label">A line to go above the statement (optional)</label>
          <textarea id="statement-note" className="input min-h-[80px]" maxLength={2000} readOnly={holding} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={`e.g. Hi ${customerName.split(' ')[0]}, here is where your account stands. Shout if anything looks off.`} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {holding ? (
              <>
                <span role="status" className="app-meta font-normal">Sending to {email} in {left}s. Closing this page cancels it.</span>
                <button type="button" className="btn-secondary btn-sm" onClick={() => hold.cancel(customerId)}><Undo2 aria-hidden="true" className="h-3.5 w-3.5" />Undo</button>
              </>
            ) : (
              <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => { setMsg(null); hold.start(customerId, send); }}>
                {busy ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Mail aria-hidden="true" className="h-3.5 w-3.5" />}Email to {email}
              </button>
            )}
          </div>
          <p className="app-meta mt-2 font-normal">Shows what is open on the account at the moment it is sent. It is not added to a schedule and nothing is sent automatically. Replies come to your Inbox.</p>
        </div>
      )}
    </section>
  );
}
