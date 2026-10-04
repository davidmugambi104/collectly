/**
 * Pure maths for /dashboard/admin/funnel. No database, no clock: rows in, numbers out.
 *
 * Cohort view: for each window (7, 30, 90 days) the cohort is the orgs that signed up inside it,
 * and every step counts how many of THOSE orgs have ever reached it (so a recent cohort reads as
 * low rather than being padded by old orgs). Signup time is the org's first `auth.signed_up` event,
 * falling back to organizations.created_at for orgs created before that event existed.
 * Nothing here carries customer data: only org names, ids, plans and timestamps.
 */

export const WINDOWS = [7, 30, 90] as const;
export const DAY_MS = 86_400_000;

export type FunnelEventRow = { orgId: string; type: string; payload: unknown; createdAt: Date };
export type FunnelOrgRow = { id: string; name: string; plan: string; createdAt: Date };
export type FunnelSubRow = { orgId: string; plan: string };
export type FunnelMembershipRow = { userId: string; orgId: string };

export type StepKey = 'signup' | 'connected' | 'synced' | 'drafted' | 'approved' | 'sent' | 'paid';

export const STEPS: { key: StepKey; label: string }[] = [
  { key: 'signup', label: 'Signed up' },
  { key: 'connected', label: 'Connected an accounting system' },
  { key: 'synced', label: 'First sync' },
  { key: 'drafted', label: 'First reminder drafted' },
  { key: 'approved', label: 'First reminder approved' },
  { key: 'sent', label: 'First reminder sent' },
  { key: 'paid', label: 'First payment after a reminder' },
];

function flag(payload: unknown, key: string): boolean | undefined {
  if (payload && typeof payload === 'object' && key in (payload as Record<string, unknown>)) {
    const v = (payload as Record<string, unknown>)[key];
    return v === true || v === 'true' ? true : v === false || v === 'false' ? false : undefined;
  }
  return undefined;
}

/** Which step (if any) does one event prove? An approval sends, so it counts toward "sent" too. */
export function stepsForEvent(e: Pick<FunnelEventRow, 'type' | 'payload'>): StepKey[] {
  switch (e.type) {
    case 'integration.connected': return ['connected'];
    case 'integration.synced': return flag(e.payload, 'hadInvoices') === false ? [] : ['synced'];
    case 'dunning.run.awaiting_approval': return ['drafted'];
    case 'dunning.run.approved': return ['approved', 'sent'];
    case 'dunning.run.sent': return ['sent'];
    case 'payment.succeeded': return flag(e.payload, 'afterReminder') === true ? ['paid'] : [];
    default: return [];
  }
}

export type StuckOrg = { orgId: string; name: string; daysSinceSignup: number };
export type FunnelStep = { key: StepKey; label: string; count: number; fromPrevious: number | null; fromSignups: number | null };
export type StuckGroup = { afterStep: StepKey; afterLabel: string; waitingFor: string; total: number; orgs: StuckOrg[] };
export type PlanMixRow = { plan: string; count: number };
export type WindowReport = {
  days: number;
  signups: number;
  steps: FunnelStep[];
  cancelRequests: number;
  planMix: PlanMixRow[];
  practiceOrgs: number;
  multiBookOwners: number;
  multiBookBooks: number;
  stuck: StuckGroup[];
};

export const STUCK_LIST_CAP = 25;

export function ratio(n: number, d: number): number | null {
  return d > 0 ? n / d : null;
}

export function buildFunnelReport(input: {
  now: Date;
  events: FunnelEventRow[];
  orgs: FunnelOrgRow[];
  subs: FunnelSubRow[];
  memberships: FunnelMembershipRow[];
  windows?: readonly number[];
}): WindowReport[] {
  const { now, events, orgs, subs, memberships } = input;
  const subPlan = new Map(subs.map((s) => [s.orgId, s.plan]));
  const signedUpAt = new Map<string, number>();
  const reached = new Map<string, Set<StepKey>>();
  const cancelAt = new Map<string, number[]>();
  for (const e of events) {
    const t = e.createdAt.getTime();
    if (e.type === 'auth.signed_up') {
      const prev = signedUpAt.get(e.orgId);
      if (prev === undefined || t < prev) signedUpAt.set(e.orgId, t);
    } else if (e.type === 'billing.cancel_requested') {
      (cancelAt.get(e.orgId) ?? cancelAt.set(e.orgId, []).get(e.orgId)!).push(t);
    }
    for (const s of stepsForEvent(e)) {
      (reached.get(e.orgId) ?? reached.set(e.orgId, new Set()).get(e.orgId)!).add(s);
    }
  }
  const orgSignup = (o: FunnelOrgRow) => signedUpAt.get(o.id) ?? o.createdAt.getTime();
  const booksByUser = new Map<string, Set<string>>();
  for (const m of memberships) (booksByUser.get(m.userId) ?? booksByUser.set(m.userId, new Set()).get(m.userId)!).add(m.orgId);

  return (input.windows ?? WINDOWS).map((days) => {
    const from = now.getTime() - days * DAY_MS;
    const cohort = orgs.filter((o) => orgSignup(o) >= from && orgSignup(o) <= now.getTime());
    const ids = new Set(cohort.map((o) => o.id));
    const has = (id: string, k: StepKey) => k === 'signup' || (reached.get(id)?.has(k) ?? false);
    const steps: FunnelStep[] = STEPS.map((s, i) => {
      const count = cohort.filter((o) => has(o.id, s.key)).length;
      const prev = i === 0 ? null : cohort.filter((o) => has(o.id, STEPS[i - 1].key)).length;
      return { key: s.key, label: s.label, count, fromPrevious: prev === null ? null : ratio(count, prev), fromSignups: i === 0 ? null : ratio(count, cohort.length) };
    });
    const mix = new Map<string, number>();
    for (const o of cohort) { const p = subPlan.get(o.id) ?? o.plan; mix.set(p, (mix.get(p) ?? 0) + 1); }
    const planMix = [...mix].map(([plan, count]) => ({ plan, count })).sort((a, b) => b.count - a.count || a.plan.localeCompare(b.plan));
    const practiceOrgs = cohort.filter((o) => { const p = subPlan.get(o.id) ?? o.plan; return p === 'growth' || p === 'scale'; }).length;
    let multiBookOwners = 0, multiBookBooks = 0;
    for (const books of booksByUser.values()) {
      if (books.size >= 2 && [...books].some((b) => ids.has(b))) { multiBookOwners++; multiBookBooks += books.size; }
    }
    const cancelRequests = [...cancelAt.values()].filter((ts) => ts.some((t) => t >= from)).length;

    // Stuck: the furthest step an org reached, reported against the step it is waiting on.
    const stuckBy = new Map<number, StuckOrg[]>();
    for (const o of cohort) {
      let top = 0;
      STEPS.forEach((s, i) => { if (has(o.id, s.key)) top = i; });
      if (top >= STEPS.length - 1) continue;
      const list = stuckBy.get(top) ?? stuckBy.set(top, []).get(top)!;
      list.push({ orgId: o.id, name: o.name, daysSinceSignup: Math.max(0, Math.floor((now.getTime() - orgSignup(o)) / DAY_MS)) });
    }
    const stuck: StuckGroup[] = [...stuckBy].sort((a, b) => a[0] - b[0]).map(([i, list]) => {
      list.sort((a, b) => b.daysSinceSignup - a.daysSinceSignup || a.name.localeCompare(b.name));
      return { afterStep: STEPS[i].key, afterLabel: STEPS[i].label, waitingFor: STEPS[i + 1].label, total: list.length, orgs: list.slice(0, STUCK_LIST_CAP) };
    });
    return { days, signups: cohort.length, steps, cancelRequests, planMix, practiceOrgs, multiBookOwners, multiBookBooks, stuck };
  });
}
