'use client';

import { useEffect, useRef } from 'react';
import { track, type MarketingEvent, type MarketingProps } from '@/lib/track';

/**
 * Fires a named event once when the page it sits on is mounted.
 *
 * The ref guard is not paranoia: React StrictMode runs effects twice in
 * development, and without it every view would be double-counted locally and
 * the numbers would disagree with production for no visible reason.
 */
export function TrackView<E extends MarketingEvent>({ event, eventProps }: { event: E; eventProps?: MarketingProps<E> }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    (track as (e: MarketingEvent, p?: unknown) => void)(event, eventProps);
  }, [event, eventProps]);
  return null;
}
