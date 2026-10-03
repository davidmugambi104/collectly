/**
 * Webhook processing for Mugavi's own subscription billing.
 *
 * Everything the database touches is injected (SubStore, EventStore), so the rules can be
 * tested without a database. Rules, in order of importance:
 *   1. The signature is verified on the raw body before anything else happens.
 *   2. An event id is processed once (claimed first, released if the handler throws, so
 *      Stripe's retry still works).
 *   3. A subscription row billed by hand (active, no Stripe subscription) is never changed
 *      by any webhook.
 *   4. Events from a connected account (Stripe Connect) never touch Mugavi's own subscriptions.
 */
import Stripe from 'stripe';
import { PLAN_PRICING } from './utils.ts';
import { isCheckoutPlan, isManualBilling, planForPriceId, extraBookPriceId, type CheckoutPlan } from './stripe-billing-config.ts';

type Env = Record<string, string | undefined>;

export type SubStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'incomplete';

export type SubRow = {
  id: string;
  orgId: string;
  plan: string;
  status: SubStatus | string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export type SubPatch = Partial<{
  plan: string;
  status: SubStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAt: Date | null;
}>;

export interface SubStore {
  findByStripeSubscriptionId(id: string): Promise<SubRow | null>;
  findByOrgId(orgId: string): Promise<SubRow | null>;
  update(rowId: string, patch: SubPatch): Promise<void>;
  insert(row: { orgId: string } & SubPatch & { plan: string; status: SubStatus }): Promise<void>;
  setOrgPlan(orgId: string, plan: string): Promise<void>;
}

export interface EventStore {
  /** True when this call recorded the id for the first time. */
  claim(eventId: string): Promise<boolean>;
  release(eventId: string): Promise<void>;
}

export type Outcome = { outcome: 'updated' | 'skipped'; reason?: string };

/** Stripe spells it canceled, our enum cancelled; unpaid and paused map to past_due. */
export function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubStatus {
  switch (status) {
    case 'canceled': return 'cancelled';
    case 'incomplete_expired': return 'cancelled';
    case 'unpaid': return 'past_due';
    case 'paused': return 'past_due';
    default: return status;
  }
}

const idOf = (v: string | { id: string } | null | undefined): string | null => (typeof v === 'string' ? v : v?.id ?? null);
const secs = (n: number | null | undefined): Date | null => (typeof n === 'number' ? new Date(n * 1000) : null);

/** The plan a subscription is on, read from its items; the extra-book item is ignored. */
function planFromItems(sub: Stripe.Subscription, env: Env): CheckoutPlan | null {
  const extra = extraBookPriceId(env);
  for (const it of sub.items?.data ?? []) {
    if (it.price?.id && it.price.id !== extra) {
      const p = planForPriceId(it.price.id, env);
      if (p) return p;
    }
  }
  return null;
}

export async function handleSubscriptionEvent(event: Stripe.Event, subs: SubStore, env: Env): Promise<Outcome> {
  if (event.account) return { outcome: 'skipped', reason: 'connected_account_event' };

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode !== 'subscription') return { outcome: 'skipped', reason: 'not_subscription_checkout' };
      const orgId = s.metadata?.orgId ?? s.client_reference_id ?? null;
      const plan = s.metadata?.plan;
      if (!orgId || !isCheckoutPlan(plan) || !PLAN_PRICING[plan]) return { outcome: 'skipped', reason: 'missing_org_or_plan' };
      const existing = await subs.findByOrgId(orgId);
      if (isManualBilling(existing)) return { outcome: 'skipped', reason: 'manual_billing_protected' };
      const customerId = idOf(s.customer);
      const subscriptionId = idOf(s.subscription);
      const paid = s.payment_status === 'paid' || s.payment_status === 'no_payment_required';
      // ACH settles days later: payment_status is unpaid now. Do not regress a row that
      // already shows the same live subscription (events can arrive out of order).
      const sameSub = !!existing && !!subscriptionId && existing.stripeSubscriptionId === subscriptionId;
      const status: SubStatus = paid ? 'active' : sameSub ? (existing!.status as SubStatus) : 'incomplete';
      const patch: SubPatch = { plan, status, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId };
      if (existing) {
        // Period dates come from customer.subscription.updated. Clear a leftover trial end so it is not shown as a renewal.
        if (existing.status === 'trialing') { patch.currentPeriodStart = null; patch.currentPeriodEnd = null; }
        await subs.update(existing.id, patch);
      } else {
        await subs.insert({ orgId, ...patch, plan, status });
      }
      await subs.setOrgPlan(orgId, plan);
      return { outcome: 'updated' };
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      let row = await subs.findByStripeSubscriptionId(sub.id);
      if (!row) {
        // May arrive before checkout.session.completed. Adopt only a row that is waiting for Stripe.
        const orgId = sub.metadata?.orgId;
        const byOrg = orgId ? await subs.findByOrgId(orgId) : null;
        if (!byOrg) return { outcome: 'skipped', reason: 'unknown_subscription' };
        if (isManualBilling(byOrg)) return { outcome: 'skipped', reason: 'manual_billing_protected' };
        if (byOrg.stripeSubscriptionId && byOrg.stripeSubscriptionId !== sub.id) return { outcome: 'skipped', reason: 'stale_subscription' };
        row = byOrg;
      }
      if (isManualBilling(row)) return { outcome: 'skipped', reason: 'manual_billing_protected' };
      const deleted = event.type === 'customer.subscription.deleted';
      const patch: SubPatch = {
        status: deleted ? 'cancelled' : mapStripeSubscriptionStatus(sub.status),
        stripeSubscriptionId: sub.id,
        stripeCustomerId: idOf(sub.customer) ?? row.stripeCustomerId,
        currentPeriodStart: secs(sub.current_period_start),
        currentPeriodEnd: secs(sub.current_period_end),
        cancelAt: deleted ? null : secs(sub.cancel_at) ?? (sub.cancel_at_period_end ? secs(sub.current_period_end) : null),
      };
      const plan = planFromItems(sub, env);
      if (plan && plan !== row.plan && !deleted) {
        patch.plan = plan;
        await subs.setOrgPlan(row.orgId, plan);
      }
      await subs.update(row.id, patch);
      return { outcome: 'updated' };
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      const subId = idOf(inv.subscription);
      if (!subId) return { outcome: 'skipped', reason: 'not_a_subscription_invoice' };
      const row = await subs.findByStripeSubscriptionId(subId);
      if (!row) return { outcome: 'skipped', reason: 'unknown_subscription' };
      if (isManualBilling(row)) return { outcome: 'skipped', reason: 'manual_billing_protected' };
      if (row.status === 'cancelled') return { outcome: 'skipped', reason: 'already_cancelled' };
      if (event.type === 'invoice.payment_failed') {
        await subs.update(row.id, { status: 'past_due' });
        return { outcome: 'updated' };
      }
      const periodEnd = secs(inv.lines?.data?.[0]?.period?.end);
      await subs.update(row.id, { status: 'active', ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}) });
      return { outcome: 'updated' };
    }
  }
  return { outcome: 'skipped', reason: 'not_a_subscription_event' };
}

const SUBSCRIPTION_EVENTS = new Set([
  'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed',
]);

/** True when the event belongs to subscription billing rather than the customer-payment path. */
export function isSubscriptionBillingEvent(event: Stripe.Event): boolean {
  if (SUBSCRIPTION_EVENTS.has(event.type)) return true;
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    return !(s.metadata?.invoiceId && s.mode === 'payment');
  }
  return false;
}

export type WebhookResult = { status: number; body: Record<string, unknown> };

export async function processStripeWebhook(args: {
  rawBody: string;
  signature: string | null;
  secret: string | undefined;
  events: EventStore;
  subs: SubStore;
  env: Env;
  /** Everything that is not subscription billing: invoice payments, refunds, disputes. */
  handleOther: (event: Stripe.Event) => Promise<void>;
}): Promise<WebhookResult> {
  if (!args.signature || !args.secret) return { status: 400, body: { error: 'missing signature' } };
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(args.rawBody, args.signature, args.secret);
  } catch (e: unknown) {
    return { status: 400, body: { error: `webhook signature failed: ${e instanceof Error ? e.message : String(e)}` } };
  }
  let claimed = false;
  try {
    claimed = await args.events.claim(event.id);
    if (!claimed) return { status: 200, body: { received: true, deduped: true } };
    if (isSubscriptionBillingEvent(event)) {
      const r = await handleSubscriptionEvent(event, args.subs, args.env);
      return { status: 200, body: { received: true, ...r } };
    }
    await args.handleOther(event);
    return { status: 200, body: { received: true } };
  } catch (e: unknown) {
    if (claimed) await args.events.release(event.id).catch(() => {});
    return { status: 500, body: { error: e instanceof Error ? e.message : String(e) } };
  }
}
