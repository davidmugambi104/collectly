import { copy, enumOf, guardProps, int, optional, token, type GuardResult, type PropSpec, type PropsOf } from './event-guard.ts';

/**
 * The registry below is the whole contract: an event name, and for each name
 * the only property keys it may carry and the shape of each value. Ids, enums,
 * small integers and booleans. Never a customer name, an email, an amount or
 * any invoice content (see src/lib/event-guard.ts, which also drops anything
 * that slips past the types at runtime). The plan with the question each event
 * answers is in 41-analytics-event-plan.md.
 */
export const MARKETING_EVENTS = {
  /** A homepage or tool call to action was followed. */
  homepage_cta_click: { location: token, label: copy },
  /** Any CTA outside the homepage (feature, vs, for and blog pages). */
  marketing_cta_click: { page: token, location: token, label: copy },
  tour_page_view: {},
  pricing_page_view: {},
  pricing_tier_click: { tier: enumOf(['starter', 'growth', 'scale', 'enterprise'] as const), monthly: optional(int) },
  /** An audience landing page (/for/...) was opened. */
  audience_page_view: { audience: enumOf(['bookkeepers', 'agencies', 'consultancies', 'uk-agencies'] as const) },
  /** A visitor typed their own numbers into the Paidnice cost calculator (once per page view, no values sent). */
  cost_calculator_used: {},
  /** Reached the sign-up form. Completion is the server event auth.signed_up. */
  signup_started: { source: optional(token) },
} as const satisfies Record<string, Record<string, PropSpec>>;

export type MarketingEvent = keyof typeof MARKETING_EVENTS;
export type MarketingProps<E extends MarketingEvent> = PropsOf<(typeof MARKETING_EVENTS)[E]>;
export type PropsArg<E extends MarketingEvent> = {} extends MarketingProps<E> ? [props?: MarketingProps<E>] : [props: MarketingProps<E>];

/**
 * Validate and clean props for an event without sending anything. Exported so
 * tests can prove that forbidden keys cannot get through; track() uses it.
 */
export function prepareEvent(event: MarketingEvent, props?: Record<string, unknown>): GuardResult {
  const shape = MARKETING_EVENTS[event] as Record<string, PropSpec> | undefined;
  if (!shape) return { props: {}, problems: [`unknown event "${String(event)}"`] };
  return guardProps(shape, props);
}

