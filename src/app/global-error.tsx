'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { reportClientError } from '@/lib/report-client-error';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('App error:', error.message, error.digest);
    reportClientError(error, { boundary: 'global-error' });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#fafafa' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: '#fef2f2', color: '#dc2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <AlertTriangle size={28} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#16171c', margin: '0 0 8px' }}>Something went wrong</h1>
            <p style={{ color: '#6c6e76', fontSize: 14, margin: '0 0 20px' }}>
              We hit an unexpected error. Your data is safe. Try again, or head back to the dashboard.
            </p>
            {error.digest && <p style={{ color: '#9ca3af', fontSize: 12, fontFamily: 'monospace', margin: '0 0 20px' }}>ref: {error.digest}</p>}
            <div style={{ display: 'inline-flex', gap: 8 }}>
              <button onClick={reset} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#0a0b0f', color: 'white', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                <RefreshCw size={14} />Try again
              </button>
              <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'white', color: '#16171c', fontSize: 14, fontWeight: 500, border: '1px solid #eeeef0', textDecoration: 'none' }}>
                <Home size={14} />Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
