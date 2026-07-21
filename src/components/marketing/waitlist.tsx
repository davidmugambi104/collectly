'use client';
import { useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

export function WaitlistForm({ variant }: { variant?: 'dark' | 'light' }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage' }),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus('ok');
      setMessage("You're on the list. We'll be in touch.");
    } catch (e) {
      setStatus('error');
      setMessage('Something went wrong. Try again.');
    }
  }

  if (status === 'ok') {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <Check className="h-4 w-4" /> {message}
      </div>
    );
  }

  const dark = variant === 'dark';
  return (
    <form onSubmit={submit} className="w-full">
      <div className={`flex flex-col sm:flex-row gap-2 rounded-lg p-1.5 ${dark ? 'bg-ink-900 border border-ink-800' : 'bg-white border border-ink-200 shadow-sm'}`}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourcompany.com"
          className={`flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none ${dark ? 'text-white placeholder:text-ink-500' : 'text-ink-900 placeholder:text-ink-400'}`}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start free <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
      {status === 'error' && <div className="mt-2 text-xs text-red-600">{message}</div>}
      {!message && (
        <p className={`mt-2 text-xs ${dark ? 'text-ink-400' : 'text-ink-500'}`}>
          Or <a href="https://app.getcollectly.app/sign-up" className="link">create an account</a> to start now.
        </p>
      )}
    </form>
  );
}
