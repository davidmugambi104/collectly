'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

export function AuditForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('US');
  const [tool, setTool] = useState('');
  const [ar, setAr] = useState('');
  const [dso, setDso] = useState('30-45');
  const [topPain, setTopPain] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ar-audit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, name, company, country, tool, ar, dso, topPain }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="h-12 w-12 mx-auto rounded-full bg-emerald-50 grid place-items-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <h2 className="mt-3 font-display font-semibold text-xl text-ink-950">Audit request received</h2>
        <p className="mt-2 text-sm text-ink-600">
          We&apos;ll review your A/R snapshot and reply within 24 hours with 3 specific fixes.
          If you don&apos;t hear back, check your spam folder or email hello@getcollectly.app.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="Your name" />
        </div>
        <div>
          <label className="label">Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" placeholder="you@company.com" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Company *</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} required className="input" placeholder="Company name" />
        </div>
        <div>
          <label className="label">Country</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="input">
            {['US', 'GB', 'AU', 'CA', 'IE', 'NZ', 'KE', 'NG', 'ZA', 'IN', 'Other'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Invoicing tool today *</label>
          <select value={tool} onChange={(e) => setTool(e.target.value)} required className="input">
            <option value="">Select one</option>
            {['QuickBooks', 'Xero', 'FreshBooks', 'Wave', 'Zoho Books', 'Spreadsheets', 'Stripe', 'Other'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Average days to payment (DSO)</label>
          <select value={dso} onChange={(e) => setDso(e.target.value)} className="input">
            {['<15', '15-30', '30-45', '45-60', '60-90', '90+', 'not-sure'].map((c) => (
              <option key={c} value={c}>{c} days</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Outstanding A/R right now</label>
        <input value={ar} onChange={(e) => setAr(e.target.value)} className="input" placeholder="e.g. $35,000 USD" />
        <p className="mt-1 text-xs text-ink-500">Optional, but helps us give a sharper audit.</p>
      </div>

      <div>
        <label className="label">What&apos;s the biggest pain in your collections process? *</label>
        <textarea
          value={topPain}
          onChange={(e) => setTopPain(e.target.value)}
          required
          rows={3}
          className="input"
          placeholder="e.g. Clients go quiet after 30 days and I don't know how to follow up without sounding desperate..."
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full text-base h-12">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending...
          </>
        ) : (
          <>
            Get my free A/R audit <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-xs text-ink-500 text-center">
        We use this only to prepare your audit. No spam, no sales pressure, no sharing with third parties.
      </p>
    </form>
  );
}
