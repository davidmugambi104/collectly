'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { track, type EventProps, type MarketingEvent } from '@/lib/track';

/**
 * A next/link that reports a named event when it is followed.
 *
 * Kept as a wrapper rather than an onClick sprinkled at each call site so the
 * event fires the same way everywhere, and so a page that is otherwise a
 * server component does not have to become a client component just to attach
 * one handler — only this link hydrates.
 */
export function TrackedLink({
  event,
  eventProps,
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  event: MarketingEvent;
  eventProps?: EventProps;
}) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}
