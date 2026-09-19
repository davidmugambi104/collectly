'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useConsent } from './consent-provider';

/**
 * Third-party scripts, mounted only once the visitor has allowed them.
 *
 * Nothing here is rendered until `has()` returns true, so outside the consent
 * zone they mount immediately and inside it they mount on the click and not
 * before. Returning null keeps the <script> tag out of the document
 * altogether, which is the difference between blocking a cookie and merely
 * declining to read it.
 *
 * Both ids are public — an AdSense ca-pub id and a Clarity project id appear
 * in the page source of every site that uses them — so neither is a secret.
 * Clarity is read from env so preview and production can point at different
 * projects; the AdSense id is inline because it has to match /ads.txt and
 * keeping the two within one grep of each other is worth more here.
 */

const ADSENSE_CLIENT = 'ca-pub-7988406449660366';

/**
 * Where advertising must never load.
 *
 * The consent provider lives in the ROOT layout, so it wraps the authenticated
 * product as well as the marketing site — which meant a customer who accepted
 * cookies got Google's ad script running on /dashboard, on pages listing their
 * customers, invoice amounts and payment history. Ads in a paid product are
 * absurd on their own; a third-party ad tracker on someone's receivables ledger
 * is worse than absurd.
 *
 * Consent is not the control here. Even an enthusiastic yes on the marketing
 * site does not mean "run AdSense over my books", so this is a route rule
 * rather than a consent category.
 */
const NO_ADS_PREFIXES = ['/dashboard', '/admin', '/sign-in', '/sign-up', '/pay'];

export function GatedScripts() {
  const { has } = useConsent();
  const pathname = usePathname();
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const adsAllowedHere = !NO_ADS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`),
  );

  return (
    <>
      {has('advertising') && adsAllowedHere && (
        // next/script with afterInteractive rather than a raw <script async>
        // in <head>: in the App Router a hand-placed tag can be evaluated
        // again on a client navigation, which throws "adsbygoogle.push()
        // error: All ins elements already have ads".
        <Script
          id="google-adsense"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      )}

      {has('analytics') && clarityId && (
        // Clarity's loader is an inline IIFE rather than a plain src because
        // it has to define the clarity() queue function before the remote tag
        // arrives, or early calls are dropped.
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", ${JSON.stringify(clarityId)});`}
        </Script>
      )}
    </>
  );
}
