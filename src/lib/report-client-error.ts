/**
 * Fired from src/app/error.tsx and src/app/global-error.tsx so a caught
 * crash survives past Vercel's short runtime-log retention (an error can
 * age out of `vercel logs` in under an hour on Hobby). Posts to
 * /api/errors, which writes a durable row and best-effort alerts an admin.
 * Never throws — a broken error reporter must not compound the original
 * crash — and uses `keepalive` so the request survives if the page
 * navigates away (e.g. the user clicks "Try again") before it lands.
 */
export function reportClientError(error: Error & { digest?: string }, extra?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({
      message: (error.message || 'Unknown error').slice(0, 2000),
      digest: error.digest,
      stack: error.stack?.slice(0, 4000),
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      ...extra,
    });
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting the error must never itself throw.
  }
}
