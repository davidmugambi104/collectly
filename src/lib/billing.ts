import Stripe from 'stripe';
import { getStripe } from '@/lib/infra';
import { db } from '@/db';
import { subscriptions, organizations, invoices, payments, events, disputes, timelineEvents, users, subStatus } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid, PLAN_PRICING } from '@/lib/utils';
import { recordEvent } from '@/lib/events';
import { applyPayment, applyRefund } from '@/lib/billing-math';

export type PlanKey = keyof typeof PLAN_PRICING;

type SubStatus = (typeof subStatus.enumValues)[number];

/**
 * Map Stripe's subscription status to our db's sub_status enum. Not a
 * 1:1 rename -- Stripe spells it "canceled" (US), our enum has
 * "cancelled" (UK), and Stripe has three statuses ('incomplete_expired',
 * 'paused', 'unpaid') our enum doesn't model at all. This used to be a
 * blind `sub.status as any` cast straight into the DB column, which
 * means every real Stripe cancellation webhook was silently trying to
 * write the literal string "canceled" into a column whose CHECK
 * constraint only allows "cancelled" -- a guaranteed Postgres
 * constraint violation on the one event (subscription actually
 * canceled) this table most needs to reflect correctly.
 */
function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubStatus {
  switch (status) {
    case 'canceled': return 'cancelled';
    case 'incomplete_expired': return 'cancelled'; // never activated, treat like cancelled
    case 'unpaid': return 'past_due';
    case 'paused': return 'past_due'; // closest "needs attention" state we model
    default: return status;
  }
}

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
            plan, status: 'active',
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
            stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
            updatedAt: new Date(),
          }).where(eq(subscriptions.id, existing[0].id));
        } else {
          await db.insert(subscriptions).values({
            id: nanoid(), orgId, plan, status: 'active',
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
            stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
          });
        }
        await db.update(organizations).set({ plan, updatedAt: new Date() }).where(eq(organizations.id, orgId));
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
          status: mapStripeSubscriptionStatus(sub.status),
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
          updatedAt: new Date(),
        }).where(eq(subscriptions.orgId, orgId));
      }
      break;
    }
    case 'charge.dispute.created': {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
      console.warn(`[stripe-webhook] dispute opened: ${dispute.id} for charge ${chargeId} amount=${dispute.amount} reason=${dispute.reason}`);
      await handleChargeDispute(dispute, chargeId, 'created');
      break;
    }
    case 'charge.dispute.closed': {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
      console.warn(`[stripe-webhook] dispute closed: ${dispute.id} status=${dispute.status}`);
      await handleChargeDispute(dispute, chargeId, 'closed');
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
      const orgId = inv.subscription_details?.metadata?.orgId;
      console.warn(`[stripe-webhook] invoice.payment_failed subscription=${inv.subscription} orgId=${orgId} amount=${inv.amount_due}`);
      if (orgId) {
        await db.update(subscriptions).set({ status: 'past_due', updatedAt: new Date() }).where(eq(subscriptions.orgId, orgId));
      }
      break;
    }
  }
}

/**
 * Handle a Stripe chargeback on an AR invoice payment (paid through the
 * hosted payment portal — see /api/payment/create-checkout, which stamps
 * invoiceId/orgId/customerId onto payment_intent_data.metadata). Disputes
 * don't carry that metadata themselves, so we retrieve the underlying
 * charge, which Stripe copies the PaymentIntent's metadata onto.
 *
 * On open: writes a `disputes` row, flips the invoice to 'disputed', logs
 * a timeline event, and emails the org owner.
 * On close: resolves the dispute row, then either reverses the payment
 * (chargeback lost — funds were clawed back) or restores the invoice's
 * prior collection status (chargeback won).
 */
async function handleChargeDispute(dispute: Stripe.Dispute, chargeId: string | undefined, phase: 'created' | 'closed') {
  if (!chargeId) return;
  try {
    const stripe = getStripe();
    const charge = await stripe.charges.retrieve(chargeId);
    const invoiceId = charge.metadata?.invoiceId;
    const orgId = charge.metadata?.orgId;
    const customerId = charge.metadata?.customerId;
    if (!invoiceId || !orgId || !customerId) {
      // Not an AR invoice payment (e.g. a SaaS subscription charge) — no
      // customer-facing dispute record to create. Structured log only.
      console.warn(`[stripe-webhook] dispute ${dispute.id} on charge ${chargeId} has no invoice metadata — skipping AR dispute record`);
      return;
    }
    const amount = dispute.amount / 100;
    const currency = (dispute.currency ?? 'usd').toUpperCase();

    if (phase === 'created') {
      await db.insert(disputes).values({
        id: nanoid(),
        orgId, invoiceId, customerId,
        reason: 'other',
        status: 'open',
        internalNotes: `Stripe chargeback ${dispute.id} — card network reason: ${dispute.reason}, amount: ${amount} ${currency}`,
      });
      await db.update(invoices).set({ status: 'disputed', updatedAt: new Date() }).where(eq(invoices.id, invoiceId));
      await db.insert(timelineEvents).values({
        id: nanoid(), orgId, customerId, invoiceId,
        eventType: 'dispute_opened',
        title: `Chargeback opened — ${amount} ${currency}`,
        description: `Card network reason: ${dispute.reason}`,
      });
      await notifyOwnerOfChargeback(orgId, { amount, currency, reason: dispute.reason, invoiceId, won: null });
    } else {
      const [openDispute] = await db
        .select()
        .from(disputes)
        .where(and(eq(disputes.invoiceId, invoiceId), eq(disputes.status, 'open')))
        .orderBy(desc(disputes.createdAt))
        .limit(1);
      if (openDispute) {
        await db.update(disputes).set({
          status: 'resolved',
          resolvedAt: new Date(),
          updatedAt: new Date(),
          internalNotes: `${openDispute.internalNotes ?? ''}\nStripe outcome: ${dispute.status}`.trim(),
        }).where(eq(disputes.id, openDispute.id));
      }

      const won = dispute.status === 'won';
      if (!won) {
        // Funds were clawed back — reverse the payment like a refund.
        await reversePaymentForInvoice({ invoiceId, refundAmount: amount, reason: 'stripe-chargeback-lost' });
      } else {
        const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
        if (inv && inv.status === 'disputed') {
          const total = Number(inv.amount);
          const paid = Number(inv.amountPaid ?? 0);
          const nextStatus =
            paid >= total ? 'paid' :
            paid > 0 ? 'partial' :
            new Date(inv.dueDate) < new Date() ? 'overdue' : 'sent';
          await db.update(invoices).set({ status: nextStatus, updatedAt: new Date() }).where(eq(invoices.id, invoiceId));
        }
      }

      await db.insert(timelineEvents).values({
        id: nanoid(), orgId, customerId, invoiceId,
        eventType: 'dispute_resolved',
        title: `Chargeback ${dispute.status}`,
      });
      await notifyOwnerOfChargeback(orgId, { amount, currency, reason: dispute.reason, invoiceId, won });
    }
  } catch (e: unknown) {
    console.error(`[stripe-webhook] dispute handler error (${phase}):`, e instanceof Error ? e.message : e);
  }
}

async function notifyOwnerOfChargeback(orgId: string, info: { amount: number; currency: string; reason: string; invoiceId: string; won: boolean | null }) {
  try {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) return;
    const [owner] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, org.ownerId)).limit(1);
    if (!owner?.email) return;
    const { sendEmail } = await import('@/lib/infra');
    const subject = info.won === null
      ? `Chargeback opened on an invoice payment — ${org.name}`
      : `Chargeback ${info.won ? 'won' : 'lost'} — ${org.name}`;
    const body = info.won === null
      ? `<p>A customer disputed a card payment made through your Collectly payment portal.</p>
         <ul><li>Amount: ${info.amount} ${info.currency}</li><li>Card network reason: ${info.reason}</li><li>Invoice: ${info.invoiceId}</li></ul>
         <p>Stripe usually requires evidence within a few days — check your Stripe dashboard.</p>`
      : info.won
        ? `<p>Good news — you won the chargeback on invoice ${info.invoiceId} (${info.amount} ${info.currency}). The invoice is marked paid again.</p>`
        : `<p>You lost the chargeback on invoice ${info.invoiceId} (${info.amount} ${info.currency}). The funds were clawed back and the invoice balance has been reopened.</p>`;
    await sendEmail({ to: owner.email, subject, html: body });
  } catch (e: unknown) {
    console.error('[stripe-webhook] chargeback notify failed:', e instanceof Error ? e.message : e);
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
  const totalDue = Number(inv.amount);
  const { newAmountPaid, status: newStatus } = applyRefund(priorPaid, refundAmount, totalDue);

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
    status: newStatus,
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

  // Compute balance variables up-front so they're available both inside
  // the transaction (for the events row) and after (for the pushback +
  // receipt email best-effort work).
  const priorPaid = Number(inv.amountPaid ?? 0);
  const totalDue = Number(inv.amount);
  const { newAmountPaid, status: newStatus } = applyPayment(priorPaid, args.amount, totalDue);
  const isPaidInFull = newStatus === 'paid';

  await db.transaction(async (tx: typeof db) => {
    await tx.insert(payments).values({
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

    await tx.update(invoices).set({
      status: newStatus,
      amountPaid: String(newAmountPaid),
      paidAt: isPaidInFull ? now : null,
      updatedAt: now,
    }).where(eq(invoices.id, args.invoiceId));

    await tx.insert(events).values({
      id: nanoid(),
      orgId: args.orgId,
      type: isPaidInFull ? 'payment.succeeded' : 'invoice.partial',
      payload: { invoiceId: args.invoiceId, amount: args.amount, method: args.method, totalDue, newAmountPaid },
    });
  });

  // Push the payment back to the connected accounting system. Best-effort:
  // if QBO/Xero is not connected, or the push fails, the local payment is
  // still recorded and a follow-up sync will reconcile on next run.
  if (isPaidInFull) {
    try {
      const { pushPaymentToAccounting } = await import('@/lib/integrations/pushback');
      await pushPaymentToAccounting({ orgId: args.orgId, invoiceId: args.invoiceId, amount: args.amount, currency: args.currency, paymentRef: newAmountPaid.toFixed(2) });
    } catch (e: unknown) {
      console.warn(`[stripe-webhook] payment pushback to accounting failed (non-fatal): ${e instanceof Error ? e.message : e}`);
    }
  }

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
  } catch  {
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
  const { upgradeRequests, organizations: orgs, users } = await import('@/db/schema');
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

  // Look up the org owner's real email so we can send them the
  // automated "here's what happens next" email. (customerEmail
  // above is the @getcollectly.app placeholder, not the inbox.)
  const [owner] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, org.ownerId))
    .limit(1);

  // Notify the customer with the 12h timeline (best-effort, non-blocking)
  if (owner?.email) {
    try {
      await sendEmail({
        to: owner.email,
        subject: `Your ${planInfo.name} upgrade for ${org.name} — invoice coming within 12 hours`,
        html: [
          `<p>Hi ${owner.name?.split(' ')[0] ?? 'there'},</p>`,
          `<p>I just received your <strong>${planInfo.name}</strong> upgrade request for <strong>${org.name}</strong>. Here's what happens next:</p>`,
          `<ol>`,
          `<li>I'll email your invoice within 12 hours (bank transfer, Wise, or PayPal — your call).</li>`,
          `<li>Once paid, I'll upgrade your account manually and confirm by email.</li>`,
          `<li>You can keep using Collectly during this window — no interruption.</li>`,
          `</ol>`,
          `<p>If you have any questions in the meantime, just reply to this email.</p>`,
          `<p>— David<br/>Founder, Collectly</p>`,
          `<hr/><p style="color:#666;font-size:12px">Request ID: ${created.id} &mdash; ${planInfo.name} ($${planInfo.monthly}/mo)</p>`,
        ].join('\n'),
      });
    } catch (e) {
      console.error('[recordUpgradeRequest] customer email failed (non-fatal):', e instanceof Error ? e.message : e);
    }
  }

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
        `<tr><td style="padding:4px 12px 4px 0"><strong>Email</strong></td><td>${owner?.email ?? customerEmail}</td></tr>`,
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
