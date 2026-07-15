'use client';

/**
 * Dev-only sign-in / sign-up surface.
 * Rendered in place of Clerk's <SignIn /> / <SignUp /> when no Clerk
 * publishable key is configured (i.e. local dev with USE_DEV_AUTH=1).
 *
 * It doesn't actually authenticate anything — it just signals intent
 * and links the user into the dashboard, where the auth-helper shim
 * returns the synthetic dev session. The point is to make the
 * sign-in/sign-up routes explorable end-to-end offline.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Mode = 'sign-in' | 'sign-up';

export function DevAuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState('dev@collectly.app');
  const [name, setName] = useState('Dev User');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // In a real flow this would call /api/auth/dev-start. For now the
      // dashboard's auth-helper already short-circuits to a dev session
      // when USE_DEV_AUTH=1, so a simple push works.
      await new Promise((r) => setTimeout(r, 250));
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  const cta = mode === 'sign-in' ? 'Sign in (dev)' : 'Create account (dev)';
  const sub =
    mode === 'sign-in'
      ? 'No Clerk keys configured — using the local dev session.'
      : 'No Clerk keys configured — start a 14-day local dev trial.';

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-8 shadow-xl"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-ink-900">
          {mode === 'sign-in' ? 'Welcome back' : 'Start free trial'}
        </h1>
        <p className="mt-1 text-sm text-ink-500">{sub}</p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Dev mode
        </p>
      </div>

      {mode === 'sign-up' && (
        <Field
          id="name"
          label="Full name"
          type="text"
          value={name}
          onChange={setName}
          autoComplete="name"
        />
      )}
      <Field
        id="email"
        label="Work email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
      />

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:opacity-60"
      >
        {busy ? 'Working…' : cta}
      </button>

      <div className="mt-5 text-center text-sm text-ink-500">
        {mode === 'sign-in' ? (
          <>
            New here?{' '}
            <Link href="/sign-up" className="font-medium text-ink-900 underline-offset-2 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/sign-in" className="font-medium text-ink-900 underline-offset-2 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label htmlFor={id} className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-ink-700">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-ink-900 focus:ring-2 focus:ring-ink-900/10"
      />
    </label>
  );
}
