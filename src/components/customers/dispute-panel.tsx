'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Plus, ShieldAlert } from 'lucide-react';

type Invoice = { id: string; number: string };
type Dispute = {
  id: string;
  reason: string;
  status: string;
  customerMessage: string | null;
  internalNotes: string | null;
};

/* Same two local recipes as the promise panel — a list row at one step below
   card weight, and an outlined empty state. */
const ROW = 'relative border bg-white [border-color:var(--hair)] lift-1';
const EMPTY = 'rounded-[10px] border border-dashed border-ink-300/70 px-4 py-6 text-center';

// Must match the live `dispute_reason` Postgres enum exactly.
const REASONS = [
  { value: 'already_paid', label: 'Already paid' },
  { value: 'need_invoice_copy', label: 'Needs invoice copy' },
  { value: 'amount_incorrect', label: 'Amount incorrect' },
  { value: 'awaiting_approval', label: 'Awaiting internal approval' },
  { value: 'missing_po', label: 'Missing PO number' },
  { value: 'payment_plan_request', label: 'Requested a payment plan' },
  { value: 'contact_account_manager', label: 'Wants to contact account manager' },
  { value: 'other', label: 'Other' },
];

/** The list rendered `d.reason.replace(/_/g,' ')`, i.e. the raw enum value
 *  ("payment plan request"). REASONS already carries real labels — use it,
 *  and fall back to the de-underscored value for any enum member added to
 *  the DB before this array catches up. */
const REASON_LABEL: Record<string, string> = Object.fromEntries(REASONS.map((r) => [r.value, r.label]));

export function DisputePanel({
  customerId,
  invoices,
  disputes,
}: {
  customerId: string;
  invoices: Invoice[];
  disputes: Dispute[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const open = disputes.filter((d) => d.status === 'open' || d.status === 'in_progress');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerId,
          invoiceId: form.get('invoiceId'),
          reason: form.get('reason'),
          customerMessage: form.get('customerMessage') || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setShowForm(false);
      router.refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function resolve(id: string) {
    setResolvingId(id); setError(null);
    try {
      const res = await fetch(`/api/disputes/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ internalNotes: notesById[id] || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      router.refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); } finally { setResolvingId(null); }
  }

  return (
    // `.section` for the same reason as the promise panel: the rows carry their
    // own edge, so a card around them would be a box inside a box.
    <section className="section" aria-labelledby="disputes-heading">
      <div className="section-head">
        <div>
          <h2 id="disputes-heading" className="app-heading">Open disputes</h2>
          <p className="app-meta mt-0.5 font-normal">Blocking payment until they are answered.</p>
        </div>
        {invoices.length > 0 && (
          <button
            className="btn-secondary btn-sm"
            aria-expanded={showForm}
            aria-controls="dispute-form"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Cancel' : <><Plus aria-hidden="true" className="h-3.5 w-3.5" />Open dispute</>}
          </button>
        )}
      </div>

      {showForm && (
        <form id="dispute-form" onSubmit={submit} className="subform mb-3 animate-rise">
          <fieldset className="m-0 w-full min-w-0 space-y-3 border-0 p-0">
            <legend className="app-label mb-1">New dispute</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="dispute-invoice" className="label">Invoice</label>
                <select id="dispute-invoice" name="invoiceId" required className="input">
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dispute-reason" className="label">Reason</label>
                <select id="dispute-reason" name="reason" required className="input" defaultValue="other">
                  {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                {/* The optional field says so; the required ones don't need to
                    each carry a mark to make the point. */}
                <label htmlFor="dispute-message" className="label">
                  Customer&apos;s message <span className="ml-1 font-normal text-ink-400">Optional</span>
                </label>
                <textarea id="dispute-message" name="customerMessage" className="input" rows={2} placeholder="What the customer said" />
              </div>
            </div>
            {error && <div role="alert" className="alert-danger">{error}</div>}
            <div className="flex items-center justify-end gap-1 border-t border-ink-200 pt-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost btn-sm">Cancel</button>
              <button disabled={loading} aria-busy={loading} className="btn-primary btn-sm">
                {loading && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Open dispute
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {open.length === 0 ? (
        <div className={EMPTY}>
          <ShieldAlert aria-hidden="true" className="mx-auto h-4 w-4 text-ink-400" />
          <p className="app-body mt-1.5 text-ink-500">No open disputes</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {open.map((d) => (
            // Urgency as a left edge (the row-urgent convention from the
            // invoices table) rather than a red wash — drawn as an element,
            // because a row with a hairline on all four sides declares the
            // `border` shorthand and would erase a border-left utility.
            <li key={d.id} className={`overflow-hidden rounded-[10px] ${ROW}`}>
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-danger-500" />
              <div className="flex items-start justify-between gap-3 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="app-label">
                    {REASON_LABEL[d.reason] ?? d.reason.replace(/_/g, ' ')}
                  </div>
                  {d.customerMessage && (
                    <div className="app-body mt-1 italic text-ink-600">&quot;{d.customerMessage}&quot;</div>
                  )}
                </div>
                <span className="badge-danger whitespace-nowrap capitalize">
                  {d.status.replace(/_/g, ' ')}
                </span>
              </div>
              {/* Resolving is the row's own small form, so it sits in a recessed
                  foot rather than floating among the row's text. */}
              <div className="flex items-center gap-2 border-t border-ink-200/70 bg-ink-50/70 px-3.5 py-2.5">
                <label htmlFor={`dispute-note-${d.id}`} className="sr-only">Resolution note</label>
                <input
                  id={`dispute-note-${d.id}`}
                  className="input flex-1 text-[13px]"
                  placeholder="Resolution note (optional)"
                  value={notesById[d.id] ?? ''}
                  onChange={(e) => setNotesById((s) => ({ ...s, [d.id]: e.target.value }))}
                />
                <button
                  disabled={resolvingId === d.id}
                  aria-busy={resolvingId === d.id}
                  onClick={() => resolve(d.id)}
                  className="btn-secondary btn-sm whitespace-nowrap"
                >
                  {resolvingId === d.id
                    ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                    : <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />}
                  Resolve
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
