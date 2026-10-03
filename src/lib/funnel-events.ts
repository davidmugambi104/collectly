import { recordEvent } from '@/lib/events';
import { prepareFunnelEvent, type FunnelEventType, type FunnelPropsArg } from '@/lib/funnel-shapes';

/**
 * Record a server-only funnel step. Goes through the same guard as the browser
 * tracker: a key that looks like personal or invoice content, or a value of the
 * wrong shape, is dropped and logged, and the event is still written with what
 * passed. Never throws (recordEvent already swallows database errors), so a
 * logging problem cannot break the action it describes.
 */
export async function recordFunnelEvent<E extends FunnelEventType>(
  orgId: string,
  type: E,
  actorId: string | undefined,
  ...args: FunnelPropsArg<E>
): Promise<void> {
  const { props, problems } = prepareFunnelEvent(type, args[0] as Record<string, unknown> | undefined);
  if (problems.length) console.warn(`[funnel] ${type}: ${problems.join('; ')}`);
  await recordEvent({ orgId, type, payload: props, actorId });
}
