'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/* Form section.
   The old form was a flat 2x3 grid of label-over-input under one heading, so
   "Phone" carried exactly as much weight as "Name" and nothing told you which
   fields belonged together or which were needed. Sections give the form an
   outline you can read before you fill it: a named group on the left, its
   fields on the right, one hairline between groups. On narrow screens the
   heading stacks above its fields instead of stealing a column. */
function Section({
  title, hint, children,
}: {
  title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="grid gap-x-8 gap-y-3 border-t border-ink-100 py-5 first:border-t-0 first:pt-0 md:grid-cols-[190px_minmax(0,1fr)]">
      <div>
        <h3 className="app-label">{title}</h3>
        {hint && <p className="app-meta mt-1 font-normal">{hint}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/** "Optional" is stated once per optional field. The alternative — an asterisk
 *  on every required field — marks the majority to describe the minority. */
function Optional() {
  return <span className="ml-1 font-normal text-ink-400">Optional</span>;
}

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
    // No heading inside the card: the page already says "New customer" in the
    // page title, and a form that repeats it twice reads as boilerplate.
    // `.panel` rather than `.card-lg`: it is the same lit surface with no
    // padding of its own, which is what lets the action bar run full-bleed to
    // the card's edges instead of floating inside a 24px inset.
    <form onSubmit={submit} className="panel max-w-3xl">
      <div className="px-6 pt-6">
        <Section title="Identity" hint="How this customer appears across invoices and reminders.">
          <div>
            <label htmlFor="cust-name" className="label">Name</label>
            <input id="cust-name" name="name" required className="input" placeholder="Acme Studios" />
          </div>
          <div>
            <label htmlFor="cust-company" className="label">Company<Optional /></label>
            <input id="cust-company" name="company" className="input" placeholder="Acme Studios Inc." />
          </div>
        </Section>

        <Section title="Contact" hint="Where dunning reminders are delivered.">
          <div>
            <label htmlFor="cust-email" className="label">Email<Optional /></label>
            <input id="cust-email" name="email" type="email" className="input" placeholder="ap@acme.com" />
          </div>
          <div>
            <label htmlFor="cust-phone" className="label">Phone<Optional /></label>
            <input id="cust-phone" name="phone" type="tel" className="input" placeholder="+1 555 123 4567" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cust-channel" className="label">Preferred channel</label>
            <select id="cust-channel" name="preferredChannel" className="input" defaultValue="email">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
            <p className="app-meta mt-1.5 font-normal">Reminders default to this channel when both are on file.</p>
          </div>
        </Section>
      </div>

      {error && <div role="alert" className="alert-danger mx-6 mb-4">{error}</div>}

      {/* Action bar. Recessed strip along the foot, so the commit is always in
          the same place on every form in the product; the primary is full-size
          (the largest target on the page) and Cancel is quiet, because an
          accidental Cancel throws away everything just typed. On a phone the
          primary comes first in visual order and spans the width — the thumb
          reaches the bottom of the screen most easily. */}
      <div className="flex flex-col-reverse gap-2 border-t border-ink-200/70 bg-ink-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
        <Link href="/dashboard/customers" className="btn-ghost w-full justify-center sm:w-auto">Cancel</Link>
        <button disabled={loading} aria-busy={loading} className="btn-primary w-full justify-center sm:w-auto">
          {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Add customer
        </button>
      </div>
    </form>
  );
}
