'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Loader2, X } from 'lucide-react';
import type { ViewPage } from '@/lib/saved-views';

type Chip = { id: string; name: string; query: string; href: string };

/**
 * Saved filters for a list page. Click a view to open it; when the current
 * filters are not saved yet, "Save this view" names them. Views are shared with
 * everyone in the organisation.
 */
export function SavedViews({ page, current, views }: { page: ViewPage; current: string; views: Chip[] }) {
  const router = useRouter();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const matching = views.find((v) => v.query === current);

  async function call(key: string, url: string, method: string, body?: unknown) {
    setBusy(key); setError(null);
    try {
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      router.refresh();
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally { setBusy(null); }
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (await call('save', '/api/saved-views', 'POST', { page, name, query: current })) { setNaming(false); setName(''); }
  }

  if (views.length === 0 && !current) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Saved views">
      <Bookmark aria-hidden="true" className="h-3.5 w-3.5 text-ink-400" />
      {views.map((v) => {
        const active = v.query === current;
        return (
          <span key={v.id} className={`badge inline-flex items-center gap-1 ${active ? 'ring-1 ring-brand-500' : ''}`}>
            <Link href={v.href} aria-current={active ? 'page' : undefined}>{v.name}</Link>
            <button type="button" className="text-ink-400 hover:text-ink-800" aria-label={`Delete view ${v.name}`} disabled={busy === v.id} onClick={() => call(v.id, `/api/saved-views/${v.id}`, 'DELETE')}>
              {busy === v.id ? <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" /> : <X aria-hidden="true" className="h-3 w-3" />}
            </button>
          </span>
        );
      })}
      {current && !matching && !naming && (
        <button type="button" className="btn-ghost btn-sm" onClick={() => setNaming(true)}>Save this view</button>
      )}
      {naming && (
        <form onSubmit={save} className="flex items-center gap-1.5">
          <label htmlFor="view-name" className="sr-only">View name</label>
          <input id="view-name" className="input h-8 w-44 py-0 text-[13px]" value={name} maxLength={40} autoFocus placeholder="Name this view" onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="btn-secondary btn-sm h-8" disabled={busy === 'save' || !name.trim()} aria-busy={busy === 'save'}>Save</button>
          <button type="button" className="btn-ghost btn-sm h-8" onClick={() => { setNaming(false); setError(null); }}>Cancel</button>
        </form>
      )}
      {error && <span role="alert" className="text-xs text-danger-600">{error}</span>}
    </div>
  );
}
