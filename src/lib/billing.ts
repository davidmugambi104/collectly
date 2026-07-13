import Stripe from 'stripe';
import { getStripe } from '@/lib/infra';
import { db } from '@/db';
import { subscriptions, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid, PLAN_PRICING } from '@/lib/utils';

export type PlanKey = keyof typeof PLAN_PRICING;

export async function createCheckoutSession(opts: { orgId: string; plan: PlanKey; customerEmail: string; successUrl: string; cancelUrl: string }) {
  const plan = PLAN_PRICING[opts.plan];
  if (!plan) throw new Error('Invalid plan');
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: opts.customerEmail,
    line_items: [{
      price_data: {
        currency: 'usd',
        recurring: { interval: 'month' },
        product_data: { name: `Collectly ${plan.name}` },
        unit_amount: plan.monthly * 100,
      },
      quantity: 1,
    }],
    metadata: { orgId: opts.orgId, plan: opts.plan },
    subscription_data: { metadata: { orgId: opts.orgId, plan: opts.plan } },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });
  return session;
}

export async function createCustomerPortal(orgId: string, returnUrl: string) {
  const stripe = getStripe();
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId)).limit(1);
  if (!sub?.stripeCustomerId) throw new Error('No Stripe customer');
  const portal = await stripe.billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: returnUrl });
  return portal;
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.orgId;
      const plan = session.metadata?.plan as PlanKey | undefined;
      if (orgId && plan && PLAN_PRICING[plan]) {
        const existing = await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId)).limit(1);
        if (existing[0]) {
          await db.update(subscriptions).set({
            plan: plan as any, status: 'active',
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
            stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
            updatedAt: new Date(),
          }).where(eq(subscriptions.id, existing[0].id));
        } else {
          await db.insert(subscriptions).values({
            id: nanoid(), orgId, plan: plan as any, status: 'active',
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
            stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
          });
        }
        await db.update(organizations).set({ plan: plan as any, updatedAt: new Date() }).where(eq(organizations.id, orgId));
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.orgId;
      if (orgId) {
        await db.update(subscriptions).set({
          status: sub.status as any,
          currentPeriodStart: new Date((sub as any).current_period_start * 1000),
          currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
          cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
          updatedAt: new Date(),
        }).where(eq(subscriptions.orgId, orgId));
      }
      break;
    }
  }
}
