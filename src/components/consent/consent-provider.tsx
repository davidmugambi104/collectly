'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ALL_DENIED,
  ALL_GRANTED,
  consentRequiredForCountry,
  readConsent,
  writeConsent,
  type ConsentCategory,
  type ConsentState,
} from '@/lib/consent';

/**
 * Country for the geo check, read from an optional `cc` cookie.
 *
 * Deliberately not `headers()` in the root layout: that opts every route into
 * dynamic rendering, and most of this site is statically generated. Not
 * middleware either — the Clerk branch there returns undefined to let the
 * request continue, and returning a response just to attach a cookie risks
 * interfering with auth for a banner.
 *
 * So: no cookie means no country, and consentRequiredForCountry() fails
 * closed, which means everyone is asked. If a `cc` cookie is ever set at the
 * edge, this narrows to the EEA/UK/CH automatically with no change here.
 */
function readCountryCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)cc=([A-Za-z]{2})(?:;|$)/);
  return match ? match[1] : null;
}

type ConsentContextValue = {
  /** null until the stored record has been read on the client. */
  consent: ConsentState | null;
  /** True once we know whether a decision exists. Guards against flashing the
   *  banner at someone who already answered. */
  ready: boolean;
  /** Whether this visitor is in a jurisdiction that requires asking. */
  required: boolean;
  /** Should the banner be on screen right now. */
  showBanner: boolean;
  has: (category: ConsentCategory) => boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  save: (choice: { analytics: boolean; advertising: boolean }) => void;
  /** Reopen the banner — the footer link that lets someone change their mind,
   *  which consent has to be as easy to withdraw as it was to give. */
  reopen: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [ready, setReady] = useState(false);
  const [reopened, setReopened] = useState(false);
  // Starts true so that during SSR and the first client render nothing
  // non-essential is allowed to mount. Relaxing it after mount can only ever
  // turn scripts ON, never retroactively un-load one.
  const [required, setRequired] = useState(true);

  // Read after mount, never during render: localStorage does not exist on the
  // server, so touching it in render is a hydration mismatch.
  useEffect(() => {
    setConsent(readConsent());
    setRequired(consentRequiredForCountry(readCountryCookie()));
    setReady(true);
  }, []);

  const commit = useCallback(
    (choice: { analytics: boolean; advertising: boolean }) => {
      const previous = consent;
      setConsent(writeConsent(choice));
      setReopened(false);

      // Withdrawing has to actually stop things, and a <script> that has
      // already executed cannot be taken back by unmounting its tag — AdSense
      // and Clarity are running in the page by then. Unmounting stops them
      // mounting again on the next navigation, which is not the same as
      // stopping them now.
      //
      // So: if any category went from allowed to denied, reload. PostHog's
      // opt_out_capturing() does take effect immediately, but the other two
      // need the page gone. Only on a downgrade — granting consent never
      // needs it, because mounting the script is enough.
      const downgraded =
        (previous?.analytics && !choice.analytics) ||
        (previous?.advertising && !choice.advertising) ||
        // No stored record outside the consent zone means the scripts were
        // already running under the default-allow.
        (!previous && !required && (!choice.analytics || !choice.advertising));
      if (downgraded && typeof window !== 'undefined') window.location.reload();
    },
    [consent, required],
  );

  const value = useMemo<ConsentContextValue>(() => {
    const has = (category: ConsentCategory) => {
      // An explicit choice always wins, wherever the visitor is. Someone in
      // the US who opens preferences and switches advertising off has said
      // no, and "we were not obliged to ask you" is not a reason to ignore
      // that. With no choice on record: allowed outside the consent zone,
      // denied inside it.
      if (consent) return consent[category];
      return !required;
    };
    return {
      consent,
      ready,
      required,
      // Reopening works everywhere; the automatic first showing only
      // where the law requires asking.
      showBanner: ready && (reopened || (required && consent === null)),
      has,
      acceptAll: () => commit(ALL_GRANTED),
      rejectAll: () => commit(ALL_DENIED),
      save: commit,
      reopen: () => setReopened(true),
    };
  }, [consent, ready, required, reopened, commit]);

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    // Rendering a gated script outside the provider would silently load it
    // for everyone, which is the exact failure this system exists to prevent.
    throw new Error('useConsent must be used inside <ConsentProvider>');
  }
  return ctx;
}
