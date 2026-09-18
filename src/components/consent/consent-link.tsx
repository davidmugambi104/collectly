'use client';

import { useConsent } from './consent-provider';

/**
 * Footer control that reopens the banner.
 *
 * Not optional decoration: GDPR Art. 7(3) requires withdrawing consent to be
 * as easy as giving it, and a banner that can only ever be answered once is
 * a one-way door. Renders nothing outside the consent zone, where there was
 * never a banner to reopen.
 */
export function ConsentLink({ className }: { className?: string }) {
  const { reopen } = useConsent();
  // Shown everywhere, not only where a banner was legally required. Someone
  // outside the EEA still gets to turn analytics and advertising off; the
  // difference is that we do not interrupt them to ask.
  return (
    <button type="button" onClick={reopen} className={className}>
      Cookie preferences
    </button>
  );
}
