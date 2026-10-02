'use client';

import { useEffect } from 'react';
import { identifyWhenReady } from '@/lib/posthog-client';

/**
 * Links the anonymous pre-signup PostHog session (which already carries
 * UTM params on every captured pageview) to the authenticated user, so
 * campaign attribution survives signup instead of resetting to a fresh
 * anonymous ID once someone logs in.
 */
export function IdentifyUser({ userId, orgId }: { userId?: string; orgId?: string }) {
  useEffect(() => {
    if (!userId || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    // Applied once analytics consent has loaded PostHog; never pulls the
    // library in for visitors who declined.
    identifyWhenReady(userId, orgId ? { orgId } : undefined);
  }, [userId, orgId]);

  return null;
}
