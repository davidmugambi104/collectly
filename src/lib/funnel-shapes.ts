import { bool, enumOf, guardProps, int, type GuardResult, type PropSpec, type PropsOf } from './event-guard.ts';

/**
 * Funnel events that only the server can see, written to the first-party
 * `events` table (src/lib/events.ts) and never to PostHog, so consent does not
 * gate them: they are an operational record of what the customer did in their
 * own workspace, not a record of a visitor.
 *
 * Only events that did not exist before are registered here. The older ones the
 * funnel also reads (dunning.run.awaiting_approval, dunning.run.approved,
 * dunning.run.sent, payment.succeeded, data.exported) keep their own payloads.
 * The same rule holds for the new ones as for the browser events: ids, enums,
 * small integers and booleans.
 */
export const FUNNEL_EVENTS = {
  /** First time an org row is created for a signed-in user: sign-up completed. */
  'auth.signed_up': {},
  /** OAuth finished and the tokens were saved. */
  'integration.connected': { provider: enumOf(['quickbooks', 'xero', 'freshbooks', 'zoho_books', 'sage', 'wave'] as const) },
  /** A manual or scheduled sync finished with a usable result. */
  'integration.synced': {
    provider: enumOf(['quickbooks', 'xero', 'square', 'freshbooks', 'zoho_books', 'sage', 'wave', 'csv'] as const),
    customers: int,
    invoices: int,
    rowErrors: int,
    hadInvoices: bool,
  },
  /** The Billing page cancel or change-plan request was filed (not a cancellation). */
  'billing.cancel_requested': {
    kind: enumOf(['cancel', 'change'] as const),
    plan: enumOf(['starter', 'growth', 'scale', 'enterprise'] as const),
    detailGiven: bool,
  },
} as const satisfies Record<string, Record<string, PropSpec>>;

export type FunnelEventType = keyof typeof FUNNEL_EVENTS;
export type FunnelProps<E extends FunnelEventType> = PropsOf<(typeof FUNNEL_EVENTS)[E]>;
export type FunnelPropsArg<E extends FunnelEventType> = {} extends FunnelProps<E> ? [payload?: FunnelProps<E>] : [payload: FunnelProps<E>];

/** Validate a server funnel payload. Pure, so tests can run it without a database. */
export function prepareFunnelEvent(type: string, payload?: Record<string, unknown>): GuardResult {
  const shape = (FUNNEL_EVENTS as Record<string, Record<string, PropSpec>>)[type];
  if (!shape) return { props: {}, problems: [`unknown funnel event "${type}"`] };
  return guardProps(shape, payload);
}
