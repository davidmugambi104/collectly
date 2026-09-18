'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useConsent } from './consent-provider';

/**
 * The consent banner.
 *
 * "Reject all" is the same size, the same weight and the same distance from
 * the text as "Accept all". Making rejection the quieter option is the
 * specific dark pattern the EDPB and the ICO have both ruled on, and it is
 * also just dishonest on a site whose homepage promises no invented metrics.
 *
 * A bar rather than a full-screen modal: nothing here blocks reading the
 * page, and holding a marketing site hostage over analytics cookies would be
 * out of proportion to what is being asked.
 *
 * Dismissing without choosing is deliberately not possible. There is no X.
 * Closing a banner is not consent, so an X would either be a silent "reject"
 * that keeps re-asking or a silent "accept" that is unlawful.
 */
export function ConsentBanner() {
  const { showBanner, acceptAll, rejectAll, save, consent } = useConsent();
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const [advertising, setAdvertising] = useState(consent?.advertising ?? false);
  const headingRef = useRef<HTMLParagraphElement>(null);

  // Move focus to the banner when it appears so a keyboard or screen-reader
  // user is not left tabbing through the whole page to reach it.
  useEffect(() => {
    if (showBanner) headingRef.current?.focus();
  }, [showBanner]);

  if (!showBanner) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-heading"
      // Solid white, not white/97. At 97% the page behind still shows through
      // the text — legible enough in a mockup, not legible over the violet
      // pricing band, and consent text is the last thing that should be hard
      // to read.
      //
      // max-h + overflow-y-auto because the expanded panel with three
      // categories is taller than the space left on a laptop: without it the
      // Advertising row and its checkbox sat below the fold of a position:
      // fixed element, i.e. unreachable.
      className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto border-t border-ink-200 bg-white shadow-[0_-4px_24px_rgba(16,24,40,0.10)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="container-page py-4 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p
              id="consent-heading"
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-base font-semibold text-ink-950 outline-none"
            >
              Cookies we would like to set
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
              The site works without any of these. We would like to use analytics to see which
              pages help and which do not, and advertising cookies from Google. Say no and nothing
              beyond the essentials loads —{' '}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-ink-900">
                privacy policy
              </Link>
              .
            </p>

            {expanded && (
              <div className="mt-4 space-y-3 border-t border-ink-200 pt-4">
                <Toggle
                  checked
                  disabled
                  label="Strictly necessary"
                  detail="Signing in, keeping your session, and remembering this choice. Cannot be switched off."
                />
                <Toggle
                  checked={analytics}
                  onChange={setAnalytics}
                  label="Analytics"
                  detail="PostHog and Microsoft Clarity. Which pages get read, where people get stuck. Clarity records the session, with input values masked."
                />
                <Toggle
                  checked={advertising}
                  onChange={setAdvertising}
                  label="Advertising"
                  detail="Google AdSense. Sets cookies used to select and measure ads."
                />
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            {expanded ? (
              <button
                type="button"
                onClick={() => save({ analytics, advertising })}
                className="rounded-lg bg-ink-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
              >
                Save choices
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="rounded-lg border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:bg-ink-50"
              >
                Choose
              </button>
            )}
            {/* Same size, same weight, same position in the flow as Accept. */}
            <button
              type="button"
              onClick={rejectAll}
              className="rounded-lg border border-ink-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:bg-ink-50"
            >
              Reject all
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="rounded-lg border border-ink-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:bg-ink-50"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  detail,
  disabled,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  label: string;
  detail: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex gap-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
      />
      <span>
        <span className="block text-sm font-medium text-ink-900">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-600">{detail}</span>
      </span>
    </label>
  );
}
