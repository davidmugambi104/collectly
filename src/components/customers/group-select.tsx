'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Which group a customer is in. "Default schedule" means none. */
export function GroupSelect({ customerId, groups, current }: { customerId: string; groups: { id: string; name: string }[]; current: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: string) {
    const prev = value; setValue(next); setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/group`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ groupId: next || null }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not change the group');
      router.refresh();
    } catch (e: unknown) { setValue(prev); setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return (
    <section className="section" aria-labelledby="group-heading">
      <h2 id="group-heading" className="app-heading">Reminder group</h2>
      <p className="app-meta mt-0.5 font-normal">Customers in a group follow that group&apos;s schedule instead of the default one.</p>
      <label htmlFor="cust-group" className="sr-only">Reminder group</label>
      <select id="cust-group" className="input mt-2 max-w-xs" value={value} disabled={busy} onChange={(e) => change(e.target.value)}>
        <option value="">Default schedule</option>
        {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      {error && <div role="alert" className="alert-danger mt-2">{error}</div>}
    </section>
  );
}
