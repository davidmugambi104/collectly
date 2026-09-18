'use client';

import { useEffect, useRef } from 'react';
import { track, type EventProps, type MarketingEvent } from '@/lib/track';

/**
 * Fires a named event once when the page it sits on is mounted.
 *
 * The ref guard is not paranoia: React StrictMode runs effects twice in
 * development, and without it every view would be double-counted locally and
 * the numbers would disagree with production for no visible reason.
 */
export function TrackView({ event, eventProps }: { event: MarketingEvent; eventProps?: EventProps }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track(event, eventProps);
  }, [event, eventProps]);
  return null;
}
