'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, Plus, HandCoins } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

type Invoice = { id: string; number: string; currency: string };
type Promise = {
  id: string;
  invoiceId: string;
  promisedAmount: string;
  promisedDate: string | Date | null;
  currency: string | null;
  status: string;
  sourceText: string | null;
};

/* Local surface recipes, shared in spirit with the customer detail page: a list
   row carries the card light model one step quieter, and an empty list reads as
   an unfilled outline rather than as a solid surface with nothing on it. */
const ROW = 'relative border bg-white [border-color:var(--hair)] lift-1';
const EMPTY = 'rounded-[10px] border border-dashed border-ink-300/70 px-4 py-6 text-center';

export function PromisePanel({
  customerId,
  invoices,
  promises,
}: {
  customerId: string;
  invoices: Invoice[];
  promises: Promise[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const active = promises.filter((p) => p.status === 'active');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/promises', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerId,
          invoiceId: form.get('invoiceId'),
          promisedAmount: form.get('promisedAmount'),
          promisedDate: form.get('promisedDate'),
          sourceText: form.get('sourceText') || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setShowForm(false);
      router.refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function setStatus(id: string, status: 'fulfilled' | 'broken') {
    setActingId(id); setError(null);
    try {
      const res = await fetch(`/api/promises/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      router.refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); } finally { setActingId(null); }
  }

  return (
    // `.section`, not `.card`: the rows below already carry their own edge, and
    // this panel sits on a page made of cards — one more box around a list of
    // boxes is what made every screen read as the same weight.
    <section className="section" aria-labelledby="promises-heading">
      <div className="section-head">
        <div>
          <h2 id="promises-heading" className="app-heading">Active promises to pay</h2>
          <p className="app-meta mt-0.5 font-normal">What the customer committed to, and by when.</p>
        </div>
        {invoices.length > 0 && (
          <button
            className="btn-secondary btn-sm"
            aria-expanded={showForm}
            aria-controls="promise-form"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Cancel' : <><Plus aria-hidden="true" className="h-3.5 w-3.5" />Log a promise</>}
          </button>
        )}
      </div>

      {showForm && (
        <form id="promise-form" onSubmit={submit} className="subform mb-3 animate-rise">
          {/* A real fieldset/legend: the group has a name, so a screen reader
              announces "New promise, Invoice" rather than four loose fields. */}
          <fieldset className="m-0 w-full min-w-0 space-y-3 border-0 p-0">
            <legend className="app-label mb-1">New promise</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="promise-invoice" className="label">Invoice</label>
                <select id="promise-invoice" name="invoiceId" required className="input">
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="promise-amount" className="label">Amount promised</label>
                <input id="promise-amount" name="promisedAmount" type="number" step="0.01" min="0.01" required className="input num" placeholder="1500.00" />
              </div>
              <div>
                <label htmlFor="promise-date" className="label">Promised date</label>
                <input id="promise-date" name="promisedDate" type="date" required className="input" />
              </div>
              <div>
                {/* Optional is called out on the field that is optional, rather
                    than every required field carrying an asterisk — three marks
                    to avoid one is the wrong trade. */}
                <label htmlFor="promise-source" className="label">
                  Source <span className="ml-1 font-normal text-ink-400">Optional</span>
                </label>
                <input id="promise-source" name="sourceText" className="input" placeholder="e.g. said on call 8/2" />
              </div>
            </div>
            {error && <div role="alert" className="alert-danger">{error}</div>}
            {/* Action bar: the commit lands bottom-right of the form, the last
                thing under the last field, and it is the only filled button in
                the panel. */}
            <div className="flex items-center justify-end gap-1 border-t border-ink-200 pt-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost btn-sm">Cancel</button>
              <button disabled={loading} aria-busy={loading} className="btn-primary btn-sm">
                {loading && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Save promise
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {active.length === 0 ? (
        <div className={EMPTY}>
          <HandCoins aria-hidden="true" className="mx-auto h-4 w-4 text-ink-400" />
          <p className="app-body mt-1.5 text-ink-500">No active promises</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {active.map((p) => (
            // Neutral row, hue carried by the badge dot. A green-tinted row per
            // promise turned a list of five into five green slabs — the same
            // wall-of-colour the badge system was rewritten to fix.
            <li key={p.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-[10px] px-3.5 py-3 ${ROW}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num-strong text-[15px]">
                    {formatCurrency(parseFloat(p.promisedAmount), p.currency ?? 'USD')}
                  </span>
                  <span className="badge-success">by {formatDate(p.promisedDate)}</span>
                </div>
                {p.sourceText && (
                  <div className="app-meta mt-1 font-normal italic">&quot;{p.sourceText}&quot;</div>
                )}
              </div>
              {/* Recording the outcome is a two-way choice, so both buttons stay
                  quiet at rest and only pick up their meaning on hover — the
                  row is for reading, not for a pair of coloured controls. */}
              <div className="flex items-center gap-1">
                <button
                  disabled={actingId === p.id}
                  aria-busy={actingId === p.id}
                  onClick={() => setStatus(p.id, 'fulfilled')}
                  className="btn-ghost btn-sm text-ink-600 hover:bg-success-50 hover:text-success-700 focus-visible:bg-success-50 focus-visible:text-success-700"
                  title="Mark fulfilled"
                >
                  <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> Fulfilled
                </button>
                <button
                  disabled={actingId === p.id}
                  aria-busy={actingId === p.id}
                  onClick={() => setStatus(p.id, 'broken')}
                  className="btn-ghost btn-sm text-ink-600 hover:bg-danger-50 hover:text-danger-700 focus-visible:bg-danger-50 focus-visible:text-danger-700"
                  title="Mark broken"
                >
                  <XCircle aria-hidden="true" className="h-3.5 w-3.5" /> Broken
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
