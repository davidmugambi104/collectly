'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <div>
      <button className="btn-secondary text-xs" onClick={() => setShowForm((v) => !v)}>
        {showForm ? 'Cancel' : '+ Add note'}
      </button>
      {showForm && (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <textarea name="note" required rows={2} className="input" placeholder="Add a note to this customer's timeline" />
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>}
          <div className="flex justify-end">
            <button disabled={loading} className="btn-primary text-sm">{loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save note</button>
          </div>
        </form>
      )}
    </div>
  );
}
