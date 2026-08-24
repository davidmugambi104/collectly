'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function SampleDataButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/seed-sample', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.loaded) {
        setStatus('ok');
        setMessage(`Loaded ${data.customers} customers and ${data.invoices} invoices.`);
        setTimeout(() => router.push('/dashboard'), 1500);
      } else if (data.ok && !data.loaded) {
        setStatus('err');
        setMessage(data.reason ?? 'Already has data.');
      } else {
        setStatus('err');
        setMessage(data.error ?? 'Failed.');
      }
    } catch (e: unknown) {
      setStatus('err');
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={load} disabled={loading} className="btn-brand">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
        {loading ? 'Loading…' : 'Load sample data'}
      </button>
      {status === 'ok' && (
        <p className="mt-2 text-sm text-emerald-700 inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" /> {message} Redirecting to dashboard…
        </p>
      )}
      {status === 'err' && (
        <p className="mt-2 text-sm text-red-700 inline-flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> {message}
        </p>
      )}
    </div>
  );
}
