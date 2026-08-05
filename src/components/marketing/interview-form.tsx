'use client';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

export function InterviewForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('US');
  const [teamSize, setTeamSize] = useState('5-10');
  const [industry, setIndustry] = useState('agency');
  const [dso, setDso] = useState('30-45');
  const [outstanding, setOutstanding] = useState('');
  const [tool, setTool] = useState('');
  const [pain, setPain] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Was unconditional (no res.ok check, no catch) — a rate-limited
      // (429, /api/interview allows 10/min) or failed submission still
      // showed "Got it, we'll reach out" to someone filling this out for
      // a $25 incentive, with nothing actually saved. Matches the pattern
      // already fixed in AuditForm (src/components/marketing/audit-form.tsx).
      const res = await fetch('/api/interview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, name, company, country, teamSize, industry, dso, outstanding, tool, pain }) });
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
        <h2 className="mt-3 font-display font-semibold text-xl text-ink-950">Got it. Thank you!</h2>
        <p className="mt-2 text-sm text-ink-600">We'll reach out within 48 hours to schedule your call. The $25 gift card will be sent after the interview.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">Name</label><input value={name} onChange={(e) => setName(e.target.value)} required className="input" /></div>
        <div><label className="label">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" /></div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div><label className="label">Company</label><input value={company} onChange={(e) => setCompany(e.target.value)} required className="input" /></div>
        <div><label className="label">Country</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="input">
            {['US','GB','AU','CA','IE','NZ','KE','NG','ZA','IN','Other'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="label">Team size</label>
          <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="input">
            {['1-4', '5-10', '11-25', '26-50', '51-100', '100+'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">Industry</label>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="input">
            {['agency', 'consulting', 'saas', 'it-services', 'accounting', 'legal', 'freelance-collective', 'other'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="label">Average days to payment (DSO)</label>
          <select value={dso} onChange={(e) => setDso(e.target.value)} className="input">
            {['<15', '15-30', '30-45', '45-60', '60-90', '90+', 'not-sure'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">Roughly how much is in outstanding A/R right now? (USD)</label><input value={outstanding} onChange={(e) => setOutstanding(e.target.value)} placeholder="e.g. $50,000" className="input" /></div>
      <div><label className="label">What tools do you use today for invoicing + AR?</label><input value={tool} onChange={(e) => setTool(e.target.value)} placeholder="e.g. QuickBooks, Xero, Wave, spreadsheets" className="input" /></div>
      <div>
        <label className="label">What's the worst part of collecting unpaid invoices?</label>
        <textarea value={pain} onChange={(e) => setPain(e.target.value)} required rows={3} className="input" placeholder="e.g. Awkward phone calls, cash flow gaps, manual chasing..." />
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full text-base h-12">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit & book a 15-min call <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}
