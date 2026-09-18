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
  const { required, reopen } = useConsent();
  if (!required) return null;
  return (
    <button type="button" onClick={reopen} className={className}>
      Cookie preferences
    </button>
  );
}
