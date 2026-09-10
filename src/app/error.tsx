'use client';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { reportClientError } from '@/lib/report-client-error';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Page error:', error.message, error.digest);
    reportClientError(error, { boundary: 'error' });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="h-12 w-12 rounded-xl bg-red-50 grid place-items-center mx-auto text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-display font-semibold text-ink-950">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-600">
          We hit an unexpected error rendering this page. Your data is safe.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-ink-400 font-mono">Reference: {error.digest}</p>
        )}
        <button onClick={reset} className="mt-5 btn-primary">
          <RefreshCw className="h-4 w-4" />Try again
        </button>
      </div>
    </div>
  );
}
