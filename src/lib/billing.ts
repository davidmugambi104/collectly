import Stripe from 'stripe';
import { getStripe } from '@/lib/infra';
import { db } from '@/db';
import { subscriptions, organizations, invoices, payments } from '@/db/schema';
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
      const invoiceId = session.metadata?.invoiceId;
      // One-time invoice payment from the customer payment portal
      if (invoiceId && session.mode === 'payment') {
        await markInvoicePaidFromSession(session, invoiceId);
        break;
      }
      // Subscription checkout (new customer subscribing to a Collectly plan)
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
    case 'payment_intent.succeeded': {
      // Backup path for one-time payments: in case checkout.session.completed
      // is missed (e.g. async payment methods like ACH), the PaymentIntent
      // success event also carries the invoiceId in metadata.
      const pi = event.data.object as Stripe.PaymentIntent;
      const invoiceId = pi.metadata?.invoiceId;
      if (invoiceId) {
        await markInvoicePaidFromPaymentIntent(pi, invoiceId);
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

/**
 * Mark an invoice paid when a customer pays through the hosted payment portal.
 * Idempotent: re-running for the same invoice is a no-op once paidAt is set.
 */
async function markInvoicePaidFromSession(session: Stripe.Checkout.Session, invoiceId: string) {
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv) {
    console.warn(`[stripe-webhook] checkout.session.completed for unknown invoice ${invoiceId}`);
    return;
  }
  if (inv.status === 'paid') return; // idempotent
  const amount = (session.amount_total ?? Math.round(Number(inv.amount) * 100)) / 100;
  await markInvoicePaidInDb({ invoiceId, customerId: inv.customerId, orgId: inv.orgId, amount, currency: inv.currency, method: 'stripe-checkout' });
}

async function markInvoicePaidFromPaymentIntent(pi: Stripe.PaymentIntent, invoiceId: string) {
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv) {
    console.warn(`[stripe-webhook] payment_intent.succeeded for unknown invoice ${invoiceId}`);
    return;
  }
  if (inv.status === 'paid') return;
  const amount = (pi.amount_received ?? pi.amount ?? 0) / 100;
  await markInvoicePaidInDb({ invoiceId, customerId: inv.customerId, orgId: inv.orgId, amount, currency: inv.currency, method: 'stripe-payment-intent' });
}

async function markInvoicePaidInDb(args: { invoiceId: string; customerId: string; orgId: string; amount: number; currency: string; method: string }) {
  const now = new Date();
  // Idempotency guard: don't double-insert a payment row if the same PI is replayed
  const existingPayment = await db.select().from(payments).where(eq(payments.invoiceId, args.invoiceId)).limit(1);
  if (existingPayment[0] && existingPayment[0].externalId === `stripe-${args.invoiceId}-${args.amount}`) return;

  await db.insert(payments).values({
    id: nanoid(),
    orgId: args.orgId,
    invoiceId: args.invoiceId,
    customerId: args.customerId,
    amount: String(args.amount),
    currency: args.currency,
    method: args.method,
    paidAt: now,
    externalId: `stripe-${args.invoiceId}-${args.amount}`,
  });
  await db.update(invoices).set({
    status: 'paid',
    amountPaid: String(args.amount),
    paidAt: now,
    updatedAt: now,
  }).where(eq(invoices.id, args.invoiceId));

  // Best-effort payment receipt email to the customer. Failures are non-fatal;
  // the payment is already recorded and the customer can request a receipt.
  try {
    const { sendEmail } = await import('@/lib/infra');
    const { customers: customersTable, organizations: orgsTable } = await import('@/db/schema');
    const [row] = await db
      .select({ customer: customersTable, org: orgsTable })
      .from(invoices)
      .innerJoin(customersTable, eq(customersTable.id, args.customerId))
      .innerJoin(orgsTable, eq(orgsTable.id, args.orgId))
      .where(eq(invoices.id, args.invoiceId))
      .limit(1);
    if (row?.customer?.email) {
      const [inv] = await db.select({ number: invoices.number }).from(invoices).where(eq(invoices.id, args.invoiceId)).limit(1);
      await sendEmail({
        to: row.customer.email,
        subject: `Receipt for invoice ${inv?.number ?? ''}`,
        html: `<p>Thank you. We received your payment of <b>${args.currency} ${args.amount}</b> on ${now.toISOString().slice(0, 10)}.</p><p>If you have any questions, reply to this email.</p><p>— ${row.org.name}</p>`,
      });
    }
  } catch (e) {
    // Don't fail the webhook on receipt-email failure
    console.warn('[stripe-webhook] payment receipt email failed (non-fatal)');
  }
}
