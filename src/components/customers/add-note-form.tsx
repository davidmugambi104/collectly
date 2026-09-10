'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PenLine } from 'lucide-react';

export function AddNoteForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null);
    const form = new FormData(e.currentTarget);
    const note = String(form.get('note') || '').trim();
    if (!note) { setLoading(false); return; }
    try {
      const res = await fetch('/api/timeline', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ customerId, note }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setShowForm(false);
      router.refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  return (
    // This control lives in a section header beside the heading, so the form
    // used to open into a column a third of the page wide. As a panel anchored
    // under the button it gets a usable measure without pushing the timeline
    // down — and it reads as a composer, which is what it is.
    <div className="relative">
      <button
        className="btn-secondary btn-sm"
        aria-expanded={showForm}
        aria-controls="customer-note-form"
        onClick={() => setShowForm((v) => !v)}
      >
        {showForm ? 'Cancel' : <><PenLine aria-hidden="true" className="h-3.5 w-3.5" />Add note</>}
      </button>
      {showForm && (
        <form
          id="customer-note-form"
          onSubmit={submit}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowForm(false); }}
          aria-label="Add a timeline note"
          className="absolute right-0 top-full z-20 mt-2 w-[min(24rem,calc(100vw-3rem))] animate-rise space-y-2 rounded-xl border bg-white p-3 [border-color:var(--hair)] lift-3"
        >
          <label htmlFor="customer-note" className="label mb-0">Note</label>
          <textarea
            id="customer-note"
            name="note"
            required
            autoFocus
            rows={3}
            className="input"
            placeholder="Add a note to this customer's timeline"
          />
          {error && <div role="alert" className="alert-danger">{error}</div>}
          <div className="flex items-center justify-end gap-1">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost btn-sm">Cancel</button>
            <button disabled={loading} aria-busy={loading} className="btn-primary btn-sm">
              {loading && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Save note
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
