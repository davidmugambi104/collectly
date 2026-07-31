'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

/**
 * Links the anonymous pre-signup PostHog session (which already carries
 * UTM params on every captured pageview) to the authenticated user, so
 * campaign attribution survives signup instead of resetting to a fresh
 * anonymous ID once someone logs in.
 */
export function IdentifyUser({ userId, orgId }: { userId?: string; orgId?: string }) {
  useEffect(() => {
    if (!userId || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.identify(userId, orgId ? { orgId } : undefined);
  }, [userId, orgId]);

  return null;
}
