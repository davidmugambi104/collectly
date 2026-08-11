'use client';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

export function QualifyForm({
  initialEmail = '',
  initialName = '',
  initialCompany = '',
}: {
  initialEmail?: string;
  initialName?: string;
  initialCompany?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [company, setCompany] = useState(initialCompany);
  const [currentTool, setCurrentTool] = useState('spreadsheet');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [frustration, setFrustration] = useState('');
  const [wouldSwitch, setWouldSwitch] = useState<'yes' | 'no' | 'maybe'>('maybe');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/qualify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, name, company, currentTool, hoursPerWeek, frustration, wouldSwitch }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="h-12 w-12 mx-auto rounded-full bg-emerald-50 grid place-items-center"><CheckCircle2 className="h-6 w-6 text-emerald-600" /></div>
        <h2 className="mt-3 font-display font-semibold text-xl text-ink-950">Thanks — that&apos;s genuinely useful.</h2>
        <p className="mt-2 text-sm text-ink-600">No pitch coming your way unless you want one. We&apos;ll only follow up if it looks like a fit.</p>
      </div>
    );
  }

  const showIdentityFields = !initialName || !initialEmail || !initialCompany;

  return (
    <form onSubmit={submit} className="space-y-5">
      {showIdentityFields && (
        <div className="grid sm:grid-cols-2 gap-3">
          {!initialName && (
            <div><label className="label">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></div>
          )}
          {!initialEmail && (
            <div><label className="label">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" /></div>
          )}
          {!initialCompany && (
            <div><label className="label">Company</label><input value={company} onChange={(e) => setCompany(e.target.value)} className="input" /></div>
          )}
        </div>
      )}
      <div>
        <label className="label">What are you currently using to track and follow up on overdue invoices?</label>
        <select value={currentTool} onChange={(e) => setCurrentTool(e.target.value)} className="input">
          <option value="spreadsheet">Spreadsheet</option>
          <option value="quickbooks-xero-reminders">QuickBooks or Xero built-in reminders</option>
          <option value="another-tool">Another tool</option>
          <option value="nothing">Nothing / ad hoc</option>
        </select>
      </div>
      <div>
        <label className="label">How many hours a week would you say you spend chasing payments?</label>
        <input value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} required className="input" placeholder="e.g. 2-3 hours" />
      </div>
      <div>
        <label className="label">What&apos;s the most frustrating part of that process for you right now?</label>
        <textarea value={frustration} onChange={(e) => setFrustration(e.target.value)} required rows={3} className="input" />
      </div>
      <div>
        <label className="label">Would you switch tools if something automated the follow-ups for you?</label>
        <select value={wouldSwitch} onChange={(e) => setWouldSwitch(e.target.value as 'yes' | 'no' | 'maybe')} className="input">
          <option value="yes">Yes</option>
          <option value="maybe">Maybe</option>
          <option value="no">No</option>
        </select>
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full text-base h-12">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}
