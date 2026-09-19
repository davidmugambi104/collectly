'use client';

import { useState } from 'react';
import { track } from '@/lib/track';

/**
 * Email capture for the free calculators.
 *
 * Of the four tools, only /tools/ar-cost-calculator asked for an email. The
 * other three let a visitor compute a number about their own business and then
 * leave — which is the highest-intent moment the site produces and the one it
 * was throwing away.
 *
 * The ask is "send me this result", not "join our waitlist". Someone who has
 * just been told their overdue book costs them £42,000 a year wants the number
 * in writing; a signup form at that moment asks them to commit to something
 * they have not decided on yet.
 *
 * `summary` is posted as painPoint so the notification carries the visitor's
 * actual inputs. A lead that says "annual drag £42,000, 63 days late, 9 late
 * clients" is worth more than an address, because the first reply can open on
 * their own numbers.
 */
export function ToolLeadCapture({
  source,
  summary,
  label = 'Email me this result',
  className = '',
}: {
  /** Which tool produced this — becomes the lead source. */
  source: string;
  /** One line describing what the visitor just calculated. */
  summary: string;
  label?: string;
  className?: string;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setState('sending');
    setError(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source, painPoint: `[${source}] ${summary}` }),
      });
      if (!res.ok) throw new Error('Something went wrong. Try again.');
      track('homepage_cta_click', { location: source, label });
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <div className={`rounded-lg border border-success-200 bg-success-50 p-4 ${className}`}>
        <p className="text-sm font-medium text-success-700">On its way.</p>
        <p className="mt-1 text-sm text-ink-700">
          Reply to it with a question about your own book and you&apos;ll get an answer from the
          person who built this, not a sequence.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`rounded-lg border border-ink-200 bg-white p-4 ${className}`}>
      <label htmlFor={`lead-${source}`} className="block text-sm font-medium text-ink-900">
        {label}
      </label>
      <p className="mt-1 text-xs text-ink-600">
        No sequence, no sales call booked on your behalf. One email with the numbers above.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id={`lead-${source}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          className="input flex-1"
          aria-describedby={error ? `lead-${source}-error` : undefined}
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800 disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : 'Send it'}
        </button>
      </div>
      {error && (
        <p id={`lead-${source}-error`} role="alert" className="mt-2 text-xs text-danger-600">
          {error}
        </p>
      )}
    </form>
  );
}
