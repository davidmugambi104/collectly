'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { FeePolicy } from '@/lib/late-fees';

export type ProposalItem = {
  key: string; invoiceId: string; period: number; invoiceNumber: string; customerName: string;
  daysLate: number; amountCents: number; amountLabel: string; currency: string; reason: string; capped: boolean;
};
export type OwedItem = { id: string; invoiceNumber: string; customerName: string; customerId: string; period: number; amountLabel: string; appliedLabel: string };

export function LateFeesPanel({ policy: initial, proposals, owed }: { policy: FeePolicy; proposals: ProposalItem[]; owed: OwedItem[] }) {
  const router = useRouter();
  const [p, setP] = useState({
    enabled: initial.enabled, kind: initial.kind, value: initial.value ? String(initial.value) : '', currency: initial.currency,
    graceDays: String(initial.graceDays), repeatMonthly: initial.repeatMonthly, capPercent: initial.capPercent === null ? '' : String(initial.capPercent),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<'apply' | 'decline' | null>(null);

  async function call(key: string, url: string, method: string, body: unknown, okText: (data: Record<string, unknown>) => string) {
    setBusy(key); setMsg(null);
    try {
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setMsg({ kind: 'ok', text: okText(data) });
      router.refresh();
      return data;
    } catch (e: unknown) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(null); }
  }

  const chosen = useMemo(() => proposals.filter((x) => picked.has(x.key)), [proposals, picked]);
  const totalsByCurrency = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of chosen) m.set(c.currency, (m.get(c.currency) ?? 0) + c.amountCents);
    return [...m].map(([cur, cents]) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(cents / 100)).join(' and ');
  }, [chosen]);

  const toggle = (key: string) => { setConfirming(null); setPicked((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; }); };

  async function decide(action: 'apply' | 'decline') {
    const items = chosen.map((c) => ({ invoiceId: c.invoiceId, period: c.period }));
    const data = await call(action, '/api/late-fees', 'POST', { action, items }, (d) => {
      const n = Number(d.recorded ?? 0), s = Number(d.skipped ?? 0);
      const base = action === 'apply' ? `${n} late fee${n === 1 ? '' : 's'} applied.` : `${n} fee${n === 1 ? '' : 's'} set aside. They will not be proposed again.`;
      return s > 0 ? `${base} ${s} could not be recorded because something changed (paid, already decided, or over the cap).` : base;
    });
    if (data) { setPicked(new Set()); setConfirming(null); }
  }

  return (
    <div className="space-y-6">
      {msg && <div role={msg.kind === 'err' ? 'alert' : 'status'} className={msg.kind === 'err' ? 'alert-danger' : 'alert-success'}>{msg.text}</div>}

      <section className="card" aria-labelledby="fee-rules-heading">
        <h2 id="fee-rules-heading" className="app-heading">Your late fee rule</h2>
        <p className="app-meta mt-1 font-normal">
          Only charge a late fee where your contract or terms say you can, and within what the law allows where you and your customer are.
          Mugavi works out and keeps track of fees. It never adds one on its own: you review each one and press Apply.
          A fee does not change the invoice in your accounting software and is not added to the payment page. Customers see it as its own line on
          reminders and statements, and you collect it yourself, then mark it paid here.
        </p>
        <label className="mt-3 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.enabled} onChange={(e) => setP({ ...p, enabled: e.target.checked })} />
          Suggest late fees for overdue invoices
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="fee-kind" className="label">Fee type</label>
            <select id="fee-kind" className="input" value={p.kind} onChange={(e) => setP({ ...p, kind: e.target.value as 'flat' | 'percent' })}>
              <option value="percent">Percentage of the unpaid balance</option>
              <option value="flat">Flat amount</option>
            </select>
          </div>
          <div>
            <label htmlFor="fee-value" className="label">{p.kind === 'percent' ? 'Percent (up to 25)' : 'Amount'}</label>
            <input id="fee-value" className="input" type="number" min={0} step="0.01" inputMode="decimal" value={p.value} onChange={(e) => setP({ ...p, value: e.target.value })} />
          </div>
          {p.kind === 'flat' && (
            <div>
              <label htmlFor="fee-currency" className="label">Currency</label>
              <input id="fee-currency" className="input" maxLength={3} value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value.toUpperCase() })} />
              <p className="app-meta mt-1 font-normal">Only invoices in this currency get a flat fee.</p>
            </div>
          )}
          <div>
            <label htmlFor="fee-grace" className="label">Grace days</label>
            <input id="fee-grace" className="input" type="number" min={0} max={365} step={1} inputMode="numeric" value={p.graceDays} onChange={(e) => setP({ ...p, graceDays: e.target.value })} />
            <p className="app-meta mt-1 font-normal">A fee is suggested once an invoice is more than this many days past due.</p>
          </div>
          <div>
            <label htmlFor="fee-cap" className="label">Cap per invoice (optional)</label>
            <input id="fee-cap" className="input" type="number" min={0} max={100} step="0.01" inputMode="decimal" placeholder="no cap" value={p.capPercent} onChange={(e) => setP({ ...p, capPercent: e.target.value })} />
            <p className="app-meta mt-1 font-normal">Total fees on one invoice never pass this percent of the invoice.</p>
          </div>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.repeatMonthly} onChange={(e) => setP({ ...p, repeatMonthly: e.target.checked })} />
          Suggest another fee every 30 days while the invoice stays unpaid
        </label>
        <div className="mt-3">
          <button className="btn-secondary btn-sm" disabled={busy === 'policy'} aria-busy={busy === 'policy'}
            onClick={() => call('policy', '/api/late-fees/policy', 'PUT', {
              enabled: p.enabled, kind: p.kind, value: Number(p.value), currency: p.currency, graceDays: Number(p.graceDays), repeatMonthly: p.repeatMonthly, capPercent: p.capPercent === '' ? null : Number(p.capPercent),
            }, () => 'Late fee rule saved. Fees already applied are not changed.')}>
            {busy === 'policy' && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Save rule
          </button>
        </div>
      </section>

      <section className="card" aria-labelledby="fee-review-heading">
        <h2 id="fee-review-heading" className="app-heading">Fees to review</h2>
        {!initial.enabled ? (
          <p className="app-meta mt-1 font-normal">Turn the rule on and save it, and fees that are due will be listed here for you to review.</p>
        ) : proposals.length === 0 ? (
          <p className="app-meta mt-1 font-normal">Nothing is due a fee right now.</p>
        ) : (
          <>
            <p className="app-meta mt-1 font-normal">Nothing is charged until you select fees and press Apply. Invoices that are disputed, or that have a promise to pay, are left out.</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left app-meta">
                  <th className="py-1.5 pr-2 font-medium"><span className="sr-only">Select</span></th>
                  <th className="py-1.5 pr-3 font-medium">Invoice</th><th className="py-1.5 pr-3 font-medium">Customer</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Days late</th><th className="py-1.5 pr-3 text-right font-medium">Fee</th><th className="py-1.5 font-medium">Why</th>
                </tr></thead>
                <tbody>
                  {proposals.map((x) => (
                    <tr key={x.key} className="border-t [border-color:var(--hair)]">
                      <td className="py-1.5 pr-2"><input type="checkbox" aria-label={`Select the fee on ${x.invoiceNumber}`} checked={picked.has(x.key)} onChange={() => toggle(x.key)} /></td>
                      <td className="py-1.5 pr-3 font-mono"><Link href={`/dashboard/invoices/${x.invoiceId}`} className="link-quiet">{x.invoiceNumber}</Link></td>
                      <td className="py-1.5 pr-3">{x.customerName}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{x.daysLate}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums font-semibold">{x.amountLabel}{x.capped && <span className="badge-warn ml-1">capped</span>}</td>
                      <td className="py-1.5 app-meta font-normal">{x.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className="btn-ghost btn-sm" onClick={() => { setConfirming(null); setPicked(picked.size === proposals.length ? new Set() : new Set(proposals.map((x) => x.key))); }}>
                {picked.size === proposals.length ? 'Clear selection' : 'Select all'}
              </button>
              {confirming ? (
                <>
                  <span role="status" className="app-meta font-normal">
                    {confirming === 'apply'
                      ? `Add ${chosen.length} late fee${chosen.length === 1 ? '' : 's'} (${totalsByCurrency}) to these customers' accounts? They will show on their next reminder and statement.`
                      : `Set aside ${chosen.length} fee${chosen.length === 1 ? '' : 's'}? They will not be proposed again.`}
                  </span>
                  <button type="button" className="btn-primary btn-sm" disabled={!!busy} onClick={() => decide(confirming)}>
                    {busy === confirming && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}{confirming === 'apply' ? 'Yes, apply' : 'Yes, set aside'}
                  </button>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirming(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-primary btn-sm" disabled={chosen.length === 0 || !!busy} onClick={() => setConfirming('apply')}>Apply selected{chosen.length ? ` (${chosen.length})` : ''}</button>
                  <button type="button" className="btn-secondary btn-sm" disabled={chosen.length === 0 || !!busy} onClick={() => setConfirming('decline')}>Do not charge selected</button>
                </>
              )}
            </div>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="fee-owed-heading">
        <h2 id="fee-owed-heading" className="app-heading">Fees customers owe</h2>
        {owed.length === 0 ? <p className="app-meta mt-1 font-normal">None. Applied fees appear here until you mark them paid or waive them.</p> : (
          <ul className="mt-2 space-y-2">
            {owed.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <span className="font-semibold tabular-nums">{f.amountLabel}</span> · <Link href={`/dashboard/customers/${f.customerId}`} className="link-quiet">{f.customerName}</Link> · <span className="font-mono">{f.invoiceNumber}</span>{f.period > 0 ? ` (month ${f.period + 1})` : ''} · applied {f.appliedLabel}
                </span>
                <span className="flex gap-1">
                  <button className="btn-secondary btn-sm" disabled={!!busy} onClick={() => call(`paid:${f.id}`, `/api/late-fees/${f.id}`, 'PATCH', { action: 'paid' }, () => 'Marked as paid.')}>Mark paid</button>
                  <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => call(`waive:${f.id}`, `/api/late-fees/${f.id}`, 'PATCH', { action: 'waive' }, () => 'Fee waived. It is no longer owed.')}>Waive</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
