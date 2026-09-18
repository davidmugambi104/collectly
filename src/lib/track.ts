import posthog from 'posthog-js';

/**
 * The marketing site's product events, in one place.
 *
 * PostHog has been installed and initialised since long before this, but the
 * only thing it ever captured was $pageview plus autocapture. Autocapture
 * records that *a* button was clicked; it cannot tell you that the button was
 * the hero CTA rather than the footer one, and it breaks silently the moment
 * someone edits the label. Named events are the ones you can build a funnel
 * on.
 *
 * Typed as a closed union so a typo is a compile error rather than a second,
 * near-identical event name quietly accumulating in the dashboard for a
 * month.
 */
export type MarketingEvent =
  | 'homepage_cta_click'
  | 'tour_page_view'
  | 'pricing_tier_click'
  | 'signup_started';

export type EventProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: MarketingEvent, props?: EventProps): void {
  // Guard rather than assume: posthog.init() only runs when
  // NEXT_PUBLIC_POSTHOG_KEY is set AND analytics consent has been granted, so
  // in local dev, in previews without the key, and for anyone who declined,
  // this would otherwise call capture() on an uninitialised client and log a
  // warning on every click.
  //
  // __loaded is posthog-js's own "init has run" flag. Checking it rather than
  // reading consent here keeps one source of truth: the provider decides
  // whether PostHog exists at all, and this just declines to talk to
  // something that does not.
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (!(posthog as unknown as { __loaded?: boolean }).__loaded) return;
  posthog.capture(event, props);
}
