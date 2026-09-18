'use client';
import { useEffect } from 'react';
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

function usePostHogInit(enabled: boolean) {
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
  }, [enabled]);

  // Withdrawing consent has to actually stop collection, not just stop asking.
  useEffect(() => {
    if (enabled) return;
    if (!initialised) return;
    posthog.opt_out_capturing();
  }, [enabled]);
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
  usePostHogInit(enabled);

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return <>{children}</>;
  return (
    <PHProvider client={posthog}>
      <PageviewTracker enabled={enabled} />
      {children}
    </PHProvider>
  );
}
