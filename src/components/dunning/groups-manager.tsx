'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Plus, Trash2 } from 'lucide-react';

export type GroupRow = { id: string; name: string; members: number; steps: number };

/** Create groups and see each one's size. Each group opens to its own schedule. */
export function GroupsManager({ groups }: { groups: GroupRow[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  async function call(key: string, url: string, method: string, body?: unknown) {
    setBusy(key); setError(null);
    try {
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      router.refresh();
      return data;
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const data = await call('create', '/api/groups', 'POST', { name });
    if (data?.id) { setName(''); router.push(`/dashboard/groups/${data.id}`); }
  }

  return (
    <div>
      <form onSubmit={create} className="card-primary">
        <label htmlFor="group-name" className="label">New group</label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input id="group-name" className="input max-w-xs" placeholder="e.g. Key accounts" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary btn-sm" disabled={!name.trim() || busy === 'create'} aria-busy={busy === 'create'}>
            {busy === 'create' ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Plus aria-hidden="true" className="h-3.5 w-3.5" />}Create group
          </button>
        </div>
        <p className="app-meta mt-2 font-normal">A group gets its own reminder schedule, copied from your default one. Customers in it follow that schedule instead.</p>
        {error && <div role="alert" className="alert-danger mt-3">{error}</div>}
      </form>

      <ul className="mt-5 space-y-3" aria-label="Groups">
        {groups.length === 0 && <li className="rounded-[10px] border border-dashed border-ink-300/70 px-4 py-6 text-center app-meta">No groups yet. Everyone follows your default schedule.</li>}
        {groups.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border bg-white p-4 [border-color:var(--hair)]">
            <div>
              <Link href={`/dashboard/groups/${g.id}`} className="app-heading hover:underline">{g.name}</Link>
              <p className="app-meta font-normal">{g.members} customer{g.members === 1 ? '' : 's'} · {g.steps} reminder step{g.steps === 1 ? '' : 's'}</p>
            </div>
            {confirm === g.id ? (
              <span className="flex items-center gap-2 text-sm">
                Delete this group? Its customers go back to the default schedule.
                <button className="btn-danger btn-sm" disabled={busy === g.id} onClick={() => call(g.id, `/api/groups/${g.id}`, 'DELETE').then(() => setConfirm(null))}>Delete</button>
                <button className="btn-ghost btn-sm" onClick={() => setConfirm(null)}>Keep</button>
              </span>
            ) : (
              <button className="btn-ghost btn-sm" aria-label={`Delete ${g.name}`} onClick={() => setConfirm(g.id)}><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
