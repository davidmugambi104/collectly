'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';

export type RecipientItem = { id: string; email: string; name: string | null; unsubscribed: boolean };

/** Extra people who also get this customer's reminders and statements, each as their own email. */
export function RecipientsPanel({ customerId, customerName, recipients, max }: { customerId: string; customerName: string; recipients: RecipientItem[]; max: number }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(key: string, url: string, method: string, body?: unknown) {
    setBusy(key); setError(null);
    try {
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      router.refresh();
      return true;
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); return false; }
    finally { setBusy(null); }
  }

  return (
    <section className="section" aria-labelledby="recipients-heading">
      <h2 id="recipients-heading" className="app-heading">Also send to</h2>
      <p className="app-meta mt-0.5 font-normal">
        Other people at {customerName} who should get the same reminders and statements, such as accounts payable. Each gets their own email with their own unsubscribe link,
        and a reply from any of them pauses the reminder and lands in your Inbox.
      </p>
      {error && <div role="alert" className="alert-danger mt-2">{error}</div>}
      {recipients.length > 0 && (
        <ul className="mt-2 space-y-1.5 text-sm" aria-label="Extra recipients">
          {recipients.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>{r.name ? <>{r.name} · </> : null}<span className="font-mono">{r.email}</span>{r.unsubscribed && <span className="badge-warn ml-2">Unsubscribed, not sent to</span>}</span>
              <button type="button" className="btn-ghost btn-sm" disabled={!!busy} aria-label={`Remove ${r.email}`} onClick={() => call(`del:${r.id}`, `/api/customers/${customerId}/recipients/${r.id}`, 'DELETE')}>
                {busy === `del:${r.id}` ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />}Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {recipients.length < max ? (
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); if (await call('add', `/api/customers/${customerId}/recipients`, 'POST', { email, name })) { setEmail(''); setName(''); } }}>
          <div>
            <label htmlFor="rec-email" className="label">Email</label>
            <input id="rec-email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ap@theircompany.com" />
          </div>
          <div>
            <label htmlFor="rec-name" className="label">Name (optional)</label>
            <input id="rec-name" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button type="submit" className="btn-secondary btn-sm" disabled={!!busy}>{busy === 'add' && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Add</button>
        </form>
      ) : <p className="app-meta mt-2 font-normal">That is the most extra recipients one customer can have ({max}).</p>}
    </section>
  );
}
