'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Loader2 } from 'lucide-react';

type Tag = 'icp' | 'maybe' | 'no';

export function TaggingControls({ id, currentTag }: { id: string; currentTag: Tag }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [tag, setTag] = useState<Tag>(currentTag);
  const [error, setError] = useState<string | null>(null);

  async function set(t: Tag) {
    const previous = tag;
    setBusy(true);
    setError(null);
    setTag(t); // optimistic
    try {
      // Was fire-and-forget: response status was never checked, so a 400
      // (bad tag value), 404 (row not found), or 401 (session lost admin
      // status) still left the button showing the newly-clicked tag as
      // selected with zero indication nothing was actually saved.
      const res = await fetch(`/api/admin/interviews/${id}/tag`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tag: t }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Failed (${res.status})`);
      }
      router.refresh();
    } catch (e: unknown) {
      setTag(previous); // roll back the optimistic update
      setError(e instanceof Error ? e.message : 'Failed to save tag');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1 text-xs">
        <Tag className="h-3 w-3 text-ink-500" />
        <button onClick={() => set('icp')} disabled={busy} className={`px-1.5 py-0.5 rounded ${tag === 'icp' ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'text-ink-500 hover:bg-ink-100'}`}>ICP</button>
        <button onClick={() => set('maybe')} disabled={busy} className={`px-1.5 py-0.5 rounded ${tag === 'maybe' ? 'bg-amber-100 text-amber-800 font-semibold' : 'text-ink-500 hover:bg-ink-100'}`}>Review</button>
        <button onClick={() => set('no')} disabled={busy} className={`px-1.5 py-0.5 rounded ${tag === 'no' ? 'bg-red-100 text-red-800 font-semibold' : 'text-ink-500 hover:bg-ink-100'}`}>Skip</button>
        {busy && <Loader2 className="h-3 w-3 animate-spin text-ink-400" />}
      </div>
      {error && <div className="mt-1 text-[10px] text-red-600">{error}</div>}
    </div>
  );
}
