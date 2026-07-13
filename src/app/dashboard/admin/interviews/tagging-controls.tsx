'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Loader2, Check } from 'lucide-react';

type Tag = 'icp' | 'maybe' | 'no';

export function TaggingControls({ id, currentTag }: { id: string; currentTag: Tag }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [tag, setTag] = useState<Tag>(currentTag);

  async function set(t: Tag) {
    setBusy(true);
    setTag(t);
    try {
      await fetch(`/api/admin/interviews/${id}/tag`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tag: t }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      <Tag className="h-3 w-3 text-ink-500" />
      <button onClick={() => set('icp')} disabled={busy} className={`px-1.5 py-0.5 rounded ${tag === 'icp' ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'text-ink-500 hover:bg-ink-100'}`}>ICP</button>
      <button onClick={() => set('maybe')} disabled={busy} className={`px-1.5 py-0.5 rounded ${tag === 'maybe' ? 'bg-amber-100 text-amber-800 font-semibold' : 'text-ink-500 hover:bg-ink-100'}`}>Review</button>
      <button onClick={() => set('no')} disabled={busy} className={`px-1.5 py-0.5 rounded ${tag === 'no' ? 'bg-red-100 text-red-800 font-semibold' : 'text-ink-500 hover:bg-ink-100'}`}>Skip</button>
      {busy && <Loader2 className="h-3 w-3 animate-spin text-ink-400" />}
    </div>
  );
}
