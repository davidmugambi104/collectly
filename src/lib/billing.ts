import Stripe from 'stripe';
import { getStripe } from '@/lib/infra';
import { db } from '@/db';
import { subscriptions, organizations, invoices, payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid, PLAN_PRICING } from '@/lib/utils';
import { recordEvent } from '@/lib/events';

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
    case 'charge.dispute.created': {
      // A customer has disputed a charge. Log it and surface to the org owner.
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
      console.warn(`[stripe-webhook] dispute opened: ${dispute.id} for charge ${chargeId} amount=${dispute.amount} reason=${dispute.reason}`);
      // Best-effort: mark the related payment as disputed by external id lookup.
      // (Full evidence-tracking is queued as Fix #5 in the events-table refactor.)
      try {
        const orgId = (dispute.metadata as any)?.orgId;
        if (orgId) {
          // Future: write a `disputes` row + email org owner. For now, structured log.
          console.warn(`[stripe-webhook] dispute orgId=${orgId} amount_cents=${dispute.amount}`);
        }
      } catch (e: any) {
        // Future: write a `disputes` row + email org owner. For now, structured log.
        console.warn(`[stripe-webhook] dispute handler non-fatal error: ${e?.message ?? e}`);
      }
      break;
    }
    case 'charge.dispute.closed': {
      const dispute = event.data.object as Stripe.Dispute;
      console.warn(`[stripe-webhook] dispute closed: ${dispute.id} status=${dispute.status}`);
      break;
    }
    case 'charge.refunded': {
      // Full or partial refund. Pull the PaymentIntent and reverse the related payment row,
      // recompute the invoice balance and roll back status from paid→partial (or partial→sent).
      const charge = event.data.object as Stripe.Charge;
      const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (!piId) break;
      const stripe = getStripe();
      const pi = await stripe.paymentIntents.retrieve(piId);
      const invoiceId = pi.metadata?.invoiceId;
      if (!invoiceId) {
        console.warn(`[stripe-webhook] charge.refunded for PI ${piId} without invoiceId metadata — skipped`);
        break;
      }
      const refundAmount = (charge.amount_refunded ?? 0) / 100;
      if (refundAmount <= 0) break;
      await reversePaymentForInvoice({ invoiceId, refundAmount, reason: 'stripe-refund' });
      break;
    }
    case 'invoice.payment_failed': {
      // Stripe-subscription invoice failed (recurring billing retry, not our customer invoices).
      // We surface this in logs and let the existing subscription.dunning flow pick it up.
      const inv = event.data.object as Stripe.Invoice;
      const orgId = (inv.subscription_details as any)?.metadata?.orgId;
      console.warn(`[stripe-webhook] invoice.payment_failed subscription=${inv.subscription} orgId=${orgId} amount=${inv.amount_due}`);
      if (orgId) {
        await db.update(subscriptions).set({ status: 'past_due', updatedAt: new Date() }).where(eq(subscriptions.orgId, orgId));
      }
      break;
    }
  }
}

/**
 * Roll back a payment and recompute the invoice balance. Used for refunds.
 * If the refund brings amountPaid below the invoice total, the invoice is moved
 * from 'paid' to 'partial' (or stays at the lower amount).
 */
async function reversePaymentForInvoice({ invoiceId, refundAmount, reason }: { invoiceId: string; refundAmount: number; reason: string }) {
  const now = new Date();
  const [inv] = await db
    .select({ amount: invoices.amount, amountPaid: invoices.amountPaid, orgId: invoices.orgId, customerId: invoices.customerId })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!inv) {
    console.warn(`[stripe-webhook] reverse for unknown invoice ${invoiceId}`);
    return;
  }
  const priorPaid = Number(inv.amountPaid ?? 0);
  const newAmountPaid = Math.max(0, priorPaid - refundAmount);
  const totalDue = Number(inv.amount);
  const newStatus = newAmountPaid + 0.005 >= totalDue ? 'paid' : newAmountPaid > 0 ? 'partial' : 'sent';

  await db.insert(payments).values({
    id: nanoid(),
    orgId: inv.orgId,
    invoiceId,
    customerId: inv.customerId,
    amount: String(-refundAmount),
    currency: 'USD',
    method: reason,
    paidAt: now,
    externalId: `refund-${invoiceId}-${refundAmount}-${now.getTime()}`,
  });
  await db.update(invoices).set({
    status: newStatus as any,
    amountPaid: String(newAmountPaid),
    paidAt: newStatus === 'paid' ? inv.paidAt : null,
    updatedAt: now,
  }).where(eq(invoices.id, invoiceId));
  console.warn(`[stripe-webhook] refund applied invoice=${invoiceId} -${refundAmount} newPaid=${newAmountPaid} status=${newStatus}`);
  await recordEvent({
    orgId: inv.orgId,
    type: 'payment.refunded',
    payload: { invoiceId, refundAmount, newAmountPaid, status: newStatus, reason },
  });
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

  // Load the invoice to compute the running balance (supports partial payments)
  const [inv] = await db
    .select({ amount: invoices.amount, amountPaid: invoices.amountPaid })
    .from(invoices)
    .where(eq(invoices.id, args.invoiceId))
    .limit(1);
  if (!inv) return;

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

  // Running total: previous amountPaid + this payment
  const priorPaid = Number(inv.amountPaid ?? 0);
  const newAmountPaid = priorPaid + args.amount;
  const totalDue = Number(inv.amount);
  const isPaidInFull = newAmountPaid + 0.005 >= totalDue; // half-cent tolerance for rounding
  const newStatus = isPaidInFull ? 'paid' : 'partial';

  await db.update(invoices).set({
    status: newStatus,
    amountPaid: String(newAmountPaid),
    paidAt: isPaidInFull ? now : null,
    updatedAt: now,
  }).where(eq(invoices.id, args.invoiceId));

  await recordEvent({
    orgId: args.orgId,
    type: isPaidInFull ? 'payment.succeeded' : 'invoice.partial',
    payload: { invoiceId: args.invoiceId, amount: args.amount, method: args.method, totalDue, newAmountPaid },
  });

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
      const [invRow] = await db.select({ number: invoices.number }).from(invoices).where(eq(invoices.id, args.invoiceId)).limit(1);
      const remaining = Math.max(0, totalDue - newAmountPaid);
      const subject = isPaidInFull
        ? `Receipt for invoice ${invRow?.number ?? ''}`
        : `Partial payment received for invoice ${invRow?.number ?? ''}`;
      const body = isPaidInFull
        ? `<p>Thank you. We received your payment of <b>${args.currency} ${args.amount}</b> on ${now.toISOString().slice(0, 10)}. Your invoice is paid in full.</p>`
        : `<p>Thank you. We received a partial payment of <b>${args.currency} ${args.amount}</b> on ${now.toISOString().slice(0, 10)}.</p><p>Remaining balance: <b>${args.currency} ${remaining.toFixed(2)}</b>.</p>`;
      await sendEmail({
        to: row.customer.email,
        subject,
        html: `${body}<p>If you have any questions, reply to this email.</p><p>— ${row.org.name}</p>`,
      });
    }
  } catch (e) {
    // Don't fail the webhook on receipt-email failure
    console.warn('[stripe-webhook] payment receipt email failed (non-fatal)');
  }
}

/* ----------------------------- UPGRADE REQUEST (soft-launch) ----------------------------- */

/**
 * Record an "I want to upgrade to plan X" request from a logged-in org.
 * Used during the soft-launch window when Stripe isn't available for the
 * Kenya-based founder. Davie reviews these manually and invoices via
 * bank transfer / Wise / PayPal. Replaced by Stripe checkout redirect
 * once Stripe Atlas (or a payment partner) is wired.
 */
export async function recordUpgradeRequest(opts: { orgId: string; plan: PlanKey; customerName?: string; country?: string; notes?: string }) {
  const { upgradeRequests, organizations: orgs } = await import('@/db/schema');
  const { sendEmail } = await import('@/lib/infra');

  const [org] = await db.select().from(orgs).where(eq(orgs.id, opts.orgId)).limit(1);
  if (!org) throw new Error('organization not found');

  const planInfo = PLAN_PRICING[opts.plan];
  if (!planInfo) throw new Error('invalid plan');

  const customerEmail = `${org.slug}@getcollectly.app`;

  const [created] = await db
    .insert(upgradeRequests)
    .values({
      orgId: opts.orgId,
      plan: opts.plan,
      customerEmail,
      customerName: opts.customerName ?? null,
      businessName: org.name,
      country: opts.country ?? null,
      notes: opts.notes ?? null,
      status: 'pending',
    })
    .returning();

  // Notify Davie (best-effort)
  try {
    await sendEmail({
      to: process.env.LEAD_NOTIFY_EMAIL ?? 'davie@getcollectly.app',
      subject: `[Upgrade request] ${org.name} → ${planInfo.name} ($${planInfo.monthly}/mo)`,
      html: [
        `<p><strong>New upgrade request.</strong></p>`,
        `<table style="border-collapse:collapse">`,
        `<tr><td style="padding:4px 12px 4px 0"><strong>Org</strong></td><td>${org.name} (${org.slug})</td></tr>`,
        `<tr><td style="padding:4px 12px 4px 0"><strong>Plan</strong></td><td>${planInfo.name} ($${planInfo.monthly}/mo)</td></tr>`,
        `<tr><td style="padding:4px 12px 4px 0"><strong>Email</strong></td><td>${customerEmail}</td></tr>`,
        `<tr><td style="padding:4px 12px 4px 0"><strong>Contact</strong></td><td>${opts.customerName ?? 'n/a'}</td></tr>`,
        `<tr><td style="padding:4px 12px 4px 0"><strong>Country</strong></td><td>${opts.country ?? 'n/a'}</td></tr>`,
        `</table>`,
        `<p><strong>Notes from customer:</strong><br/>${(opts.notes ?? '(none)').replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</p>`,
        `<p style="color:#666;font-size:12px">Request ID: ${created.id} &mdash; review at <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getcollectly.app'}/admin/upgrade-requests">/admin/upgrade-requests</a></p>`,
      ].join('\n'),
    });
  } catch (e) {
    console.error('[recordUpgradeRequest] notify Davie failed (non-fatal):', e instanceof Error ? e.message : e);
  }

  return { requestId: created.id, plan: planInfo.name, monthly: planInfo.monthly };
}
