'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useConsent } from '@/components/consent/consent-provider';

/**
 * PostHog, gated on analytics consent.
 *
 * This used to call posthog.init() at module scope, which fires on import —
 * before React renders, before anyone can be asked anything. That is fine
 * outside the EEA/UK and is not fine inside it, so init now happens in an
 * effect that will not run until consent is granted.
 *
 * opt_out_capturing_by_default is belt and braces: if this component is ever
 * rendered without the gate, PostHog still captures nothing until something
 * explicitly opts in.
 */
let initialised = false;

/**
 * Returns whether PostHog is initialised AND allowed to capture.
 *
 * The boolean matters because of React's effect ordering: child effects run
 * BEFORE parent effects. PageviewTracker is a child of this provider, so on
 * the render where consent flips to granted its effect fired first and called
 * capture('$pageview') against a PostHog that had not been init'ed yet. The
 * event was dropped, and because neither `pathname` nor `enabled` changed
 * again, nothing ever retried it — a landing visitor produced no pageview at
 * all. Twelve seconds on the live homepage, zero capture requests.
 *
 * Handing the tracker a "ready" flag that flips in THIS effect makes the
 * ordering explicit instead of accidental: the flag can only become true
 * after init has run, and flipping it re-runs the child effect.
 */
function usePostHogInit(enabled: boolean): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (!initialised) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: true,
        opt_out_capturing_by_default: true,
      });
      initialised = true;
    }
    posthog.opt_in_capturing();
    setReady(true);
  }, [enabled]);

  // Withdrawing consent has to actually stop collection, not just stop asking.
  useEffect(() => {
    if (enabled) return;
    if (!initialised) return;
    posthog.opt_out_capturing();
    setReady(false);
  }, [enabled]);

  return ready;
}

function PageviewTracker({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    if (!enabled) return;
    if (!pathname || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.capture('$pageview', { $current_url: window.location.href });
  }, [pathname, search, enabled]);
  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { has } = useConsent();
  const enabled = has('analytics');
  const ready = usePostHogInit(enabled);

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return <>{children}</>;
  return (
    <PHProvider client={posthog}>
      <PageviewTracker enabled={enabled && ready} />
      {children}
    </PHProvider>
  );
}
