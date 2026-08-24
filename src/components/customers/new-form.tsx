'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function NewCustomerForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null);
    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form.entries());
    try {
      const res = await fetch('/api/customers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      router.push('/dashboard/customers');
      router.refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="card-lg max-w-2xl space-y-5">
      <h2 className="h3">New customer</h2>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Name</label><input name="name" required className="input" placeholder="Acme Studios" /></div>
        <div><label className="label">Company</label><input name="company" className="input" placeholder="Acme Studios Inc." /></div>
        <div><label className="label">Email</label><input name="email" type="email" className="input" placeholder="ap@acme.com" /></div>
        <div><label className="label">Phone</label><input name="phone" type="tel" className="input" placeholder="+1 555 123 4567" /></div>
        <div className="col-span-2">
          <label className="label">Preferred channel</label>
          <select name="preferredChannel" className="input" defaultValue="email">
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </div>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="flex justify-end gap-2">
        <Link href="/dashboard/customers" className="btn-secondary text-sm">Cancel</Link>
        <button disabled={loading} className="btn-primary text-sm">{loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Add customer</button>
      </div>
    </form>
  );
}
