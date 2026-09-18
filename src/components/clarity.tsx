import Script from 'next/script';

/**
 * Microsoft Clarity session recording and heatmaps.
 *
 * Returns null when NEXT_PUBLIC_CLARITY_PROJECT_ID is unset, so local dev and
 * preview deployments do not pollute the production project with sessions
 * nobody wants to watch. The id is public by design — it ships in the page
 * source of every site that uses Clarity — but it is read from env rather
 * than inlined so preview and production can point at different projects.
 *
 * Clarity's own loader is an inline IIFE rather than a plain src, because it
 * has to define the `clarity()` queue function before the remote tag arrives
 * or early calls are dropped. That is why this uses an inline script instead
 * of Script's `src`.
 *
 * Same caveat as the AdSense loader in layout.tsx: this records sessions and
 * sets cookies before any consent interaction. The site is en-GB with
 * areaServed GB, so PECR and GDPR apply to UK and EU visitors, and Clarity's
 * recordings are more sensitive than ad cookies because they capture
 * behaviour. Put it behind a consent gate before relying on it. Clarity does
 * mask input values by default; it does not mask the fact of the session.
 */
export function Clarity() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  if (!projectId) return null;

  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", ${JSON.stringify(projectId)});`}
    </Script>
  );
}
