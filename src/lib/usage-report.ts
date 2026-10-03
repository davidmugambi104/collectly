/**
 * Pure maths for /dashboard/admin/usage: group usage rows per org, attach the
 * plan price when it is honestly known, and work out the estimated margin.
 * Relative imports only; no database. The query lives in usage-report-load.ts.
 */
import { USAGE_KINDS, type UsageKind } from './usage-meter-core.ts';
import { PLAN_PRICING } from './utils.ts';

export const COST_FLAG_RATIO = 0.1;
export const MICROS_PER_USD = 1_000_000;

export type UsageEventRow = { orgId: string; kind: string; units: number; costMicros: number; createdAt: Date };
export type OrgRow = { id: string; name: string };
export type SubRow = { orgId: string; plan: string; status: string; stripeSubscriptionId: string | null };

export type PlanPrice =
  | { kind: 'list'; plan: string; usd: number } // a Stripe subscription: the plan's list price (discounts not reflected)
  | { kind: 'manual'; plan: string } // active but billed by hand: the amount is not recorded
  | { kind: 'trial'; plan: string } // not paying yet
  | { kind: 'none' } // cancelled or incomplete
  | { kind: 'unknown' }; // no subscription row

export type Window = { byKind: Partial<Record<UsageKind, number>>; costMicros: number };
export type OrgUsage = {
  orgId: string;
  name: string;
  price: PlanPrice;
  last30: Window;
  month: Window;
  /** Estimated gross margin in USD for the calendar month, or null when the price is not a known amount. */
  marginMonthUsd: number | null;
  /** True when the estimated monthly cost is above COST_FLAG_RATIO of a known price. */
  flagged: boolean;
};
export type UsageReport = { orgs: OrgUsage[]; totals: { last30: Window; month: Window; knownRevenueUsd: number; flaggedCount: number } };

export function planPrice(sub: SubRow | undefined): PlanPrice {
  if (!sub) return { kind: 'unknown' };
  if (sub.status === 'cancelled' || sub.status === 'incomplete') return { kind: 'none' };
  if (sub.status === 'trialing') return { kind: 'trial', plan: sub.plan };
  const plan = PLAN_PRICING[sub.plan as keyof typeof PLAN_PRICING];
  if (sub.stripeSubscriptionId && plan) return { kind: 'list', plan: sub.plan, usd: plan.monthly };
  return { kind: 'manual', plan: sub.plan };
}

export function priceUsd(p: PlanPrice): number | null {
  return p.kind === 'list' ? p.usd : null;
}

/** Cost above the threshold share of a known price. Unknown, manual and trial prices are never flagged. */
export function isCostFlagged(costMicros: number, price: PlanPrice): boolean {
  const usd = priceUsd(price);
  return usd !== null && usd > 0 && costMicros / MICROS_PER_USD > usd * COST_FLAG_RATIO;
}

export function marginUsd(costMicros: number, price: PlanPrice): number | null {
  const usd = priceUsd(price);
  return usd === null ? null : Math.round((usd - costMicros / MICROS_PER_USD) * 100) / 100;
}

const emptyWindow = (): Window => ({ byKind: {}, costMicros: 0 });
function add(w: Window, kind: string, units: number, cost: number) {
  if (!(USAGE_KINDS as readonly string[]).includes(kind)) return;
  w.byKind[kind as UsageKind] = (w.byKind[kind as UsageKind] ?? 0) + units;
  w.costMicros += cost;
}

export function monthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function buildUsageReport(input: { events: UsageEventRow[]; orgs: OrgRow[]; subs: SubRow[]; now: Date }): UsageReport {
  const since30 = input.now.getTime() - 30 * 86_400_000;
  const monthStart = monthStartUtc(input.now).getTime();
  const subByOrg = new Map(input.subs.map((s) => [s.orgId, s]));
  const nameByOrg = new Map(input.orgs.map((o) => [o.id, o.name]));
  const per = new Map<string, { last30: Window; month: Window }>();
  const totals = { last30: emptyWindow(), month: emptyWindow() };

  for (const e of input.events) {
    const t = e.createdAt.getTime();
    const in30 = t >= since30 && t <= input.now.getTime();
    const inMonth = t >= monthStart && t <= input.now.getTime();
    if (!in30 && !inMonth) continue;
    const slot = per.get(e.orgId) ?? { last30: emptyWindow(), month: emptyWindow() };
    per.set(e.orgId, slot);
    if (in30) { add(slot.last30, e.kind, e.units, e.costMicros); add(totals.last30, e.kind, e.units, e.costMicros); }
    if (inMonth) { add(slot.month, e.kind, e.units, e.costMicros); add(totals.month, e.kind, e.units, e.costMicros); }
  }

  // Every org with a plan shows up, even at zero usage, so revenue is not hidden.
  const ids = new Set<string>([...per.keys(), ...subByOrg.keys()]);
  const orgs: OrgUsage[] = [...ids].map((orgId) => {
    const w = per.get(orgId) ?? { last30: emptyWindow(), month: emptyWindow() };
    const price = planPrice(subByOrg.get(orgId));
    return {
      orgId, name: nameByOrg.get(orgId) ?? orgId, price, last30: w.last30, month: w.month,
      marginMonthUsd: marginUsd(w.month.costMicros, price),
      flagged: isCostFlagged(w.month.costMicros, price) || isCostFlagged(w.last30.costMicros, price),
    };
  }).sort((a, b) => b.month.costMicros - a.month.costMicros || a.name.localeCompare(b.name));

  const knownRevenueUsd = orgs.reduce((n, o) => n + (priceUsd(o.price) ?? 0), 0);
  return { orgs, totals: { ...totals, knownRevenueUsd, flaggedCount: orgs.filter((o) => o.flagged).length } };
}

export function formatCostUsd(micros: number): string {
  const usd = micros / MICROS_PER_USD;
  return usd < 1 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}
