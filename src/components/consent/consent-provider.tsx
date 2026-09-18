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

  const commit = useCallback((choice: { analytics: boolean; advertising: boolean }) => {
    setConsent(writeConsent(choice));
    setReopened(false);
  }, []);

  const value = useMemo<ConsentContextValue>(() => {
    const has = (category: ConsentCategory) => {
      // Outside the consent zone the scripts behave as they always did.
      if (!required) return true;
      return consent ? consent[category] : false;
    };
    return {
      consent,
      ready,
      required,
      showBanner: ready && required && (reopened || consent === null),
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
