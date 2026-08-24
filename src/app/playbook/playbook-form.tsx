'use client';
import { useState } from 'react';
import { Loader2, Download, CheckCircle2, Mail, Building2, User } from 'lucide-react';

export function PlaybookForm() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/playbook/download', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined, company: company || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Download failed. Try again.');
        return;
      }
      // Save the PDF as a download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'collectly-dso-playbook.pdf';
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? 'Download failed.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="card-lg bg-emerald-50 border-emerald-200 text-center">
        <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600" />
        <h3 className="mt-3 font-display font-semibold text-ink-950 text-lg">Check your downloads folder</h3>
        <p className="mt-1 text-sm text-ink-600">
          The PDF should be on your machine. Read it today — Step 1 alone typically recovers $4,200 in the first week.
        </p>
        <p className="mt-3 text-xs text-ink-500">Want us to email you the playbook too? <a href="/ar-audit" className="link">Book a free 15-min A/R review</a> and we&apos;ll send it.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card-lg">
      <h3 className="font-display font-semibold text-ink-950 text-lg">Get the free playbook</h3>
      <p className="mt-1 text-sm text-ink-600">PDF starts downloading as soon as you submit.</p>
      <div className="mt-5 space-y-3">
        <div>
          <label className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Work email</label>
          <div className="mt-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="input pl-9"
              aria-label="Work email"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Name (optional)</label>
            <div className="mt-1 relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input pl-9" aria-label="Your name" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Company (optional)</label>
            <div className="mt-1 relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your company" className="input pl-9" aria-label="Company" />
            </div>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-brand w-full justify-center">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {loading ? 'Generating PDF…' : 'Download the playbook'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-ink-500 text-center">
          We&apos;ll email you the playbook link and one follow-up after 7 days. No other marketing.
        </p>
      </div>
    </form>
  );
}
