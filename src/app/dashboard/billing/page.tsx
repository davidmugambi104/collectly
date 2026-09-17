export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth, requireOrgId } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { organizations, subscriptions, customers, invoices, payments } from '@/db/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { CheckCircle2, Sparkles, ArrowUpRight, CreditCard, Calendar, AlertCircle, ExternalLink, FileText, X } from 'lucide-react';
import { PLAN_PRICING, formatCurrency, formatDate } from '@/lib/utils';
import { createCustomerPortal } from '@/lib/billing';
import Link from 'next/link';

// Limits come from PLAN_PRICING. This file used to keep its own table, and it
// drifted: it still capped Starter at 50 invoices and 1 user after the plan
// moved to unlimited invoices and 3 users, so a paying customer was shown a
// ceiling they had not actually bought.

const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ upgraded?: string; cancelled?: string; requested?: string; plan?: string; req?: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const sp = await searchParams;
  const justUpgraded = sp.upgraded === '1';
  const justCancelled = sp.cancelled === '1';
  const justRequested = sp.requested === '1' && sp.plan;

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId)).limit(1);
  const plan = (sub?.plan ?? org?.plan ?? 'starter') as keyof typeof PLAN_PRICING;
  const current = PLAN_PRICING[plan] ?? PLAN_PRICING.starter;

  // Usage this month (server-side, no Stripe needed)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ customerCount }] = await db
    .select({ customerCount: sql<number>`count(*)::int` })
    .from(customers)
    .where(eq(customers.orgId, orgId));
  const [{ invoiceCountThisMonth }] = await db
    .select({ invoiceCountThisMonth: sql<number>`count(*)::int` })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), gte(invoices.createdAt, monthStart)));
  const [{ connectedIntegrations }] = await db
    .select({ connectedIntegrations: sql<number>`count(*)::int` })
    .from(sql`integrations`)
    .where(sql`org_id = ${orgId} AND status = 'connected'`);

  // Recent payments → "invoice history" (real receipts, not Stripe-generated)
  const recentPayments = await db
    .select({ payment: payments, invoice: invoices, customer: customers })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(eq(payments.orgId, orgId))
    .orderBy(desc(payments.paidAt))
    .limit(10);

  async function upgrade(form: FormData) {
    'use server';
    // Re-derive the session inside the action — the page-render guard above
    // does not protect this POST endpoint. See requireOrgId in auth-helper.
    const actorOrgId = await requireOrgId();
    if (!actorOrgId) return;
    const target = String(form.get('plan') ?? '') as keyof typeof PLAN_PRICING;
    if (!target || !PLAN_PRICING[target]) return;
    // Soft-launch flow: record the upgrade request, notify Davie, show confirmation.
    // Replaced by Stripe checkout redirect once Stripe Atlas is set up.
    const { recordUpgradeRequest } = await import('@/lib/billing');
    const result = await recordUpgradeRequest({
      orgId: actorOrgId,
      plan: target,
    });
    redirect(`/dashboard/billing?requested=1&plan=${target}&req=${result.requestId}`);
  }

  async function openPortal() {
    'use server';
    const actorOrgId = await requireOrgId();
    if (!actorOrgId) return;
    try {
      const session = await createCustomerPortal(
        actorOrgId,
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
      );
      if (session.url) redirect(session.url);
    } catch {
      // No Stripe customer yet, or Stripe not configured — fail silently
    }
  }

  const trialDaysLeft = sub?.currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / 86400000))
    : 0;
  const isTrialing = sub?.status === 'trialing';

  return (
    <AppShell title="Billing" subtitle="Plans, usage, and receipts.">
      {justRequested && (
        <div className="mb-4 rounded-[10px] border border-success-200/70 bg-success-50/70 p-4 text-[13px] text-success-900 lift-1 animate-settle">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold">
                {PLAN_PRICING[sp.plan as keyof typeof PLAN_PRICING]?.name ?? sp.plan} upgrade request received
              </div>
              <p className="mt-1 text-success-900/80">
                Here&apos;s what happens next:
              </p>
              <ol className="mt-2 space-y-1 text-success-900/80 list-decimal list-inside">
                <li>David emails your invoice <b>within 12 hours</b> (bank transfer, Wise, or PayPal — your choice).</li>
                <li>Once paid, your account is upgraded manually and you&apos;ll get a confirmation email.</li>
                <li>You can keep using Collectly during this window — no interruption.</li>
              </ol>
              <p className="mt-2 text-xs text-success-900/70">
                Questions? Reply to the invoice email or reach David at <a href="mailto:david@getcollectly.app" className="underline">david@getcollectly.app</a>.
              </p>
            </div>
          </div>
        </div>
      )}
      {justUpgraded && (
        <div className="mb-4 rounded-lg border border-success-200 bg-success-50 p-3 flex items-center gap-2 text-[13px] text-success-800">
          <CheckCircle2 className="h-4 w-4" />
          <span>Plan upgraded. Welcome to {current.name}.</span>
        </div>
      )}
      {justCancelled && (
        <div className="mb-4 rounded-lg border border-warn-200 bg-warn-50 p-3 flex items-center gap-2 text-[13px] text-warn-800">
          <AlertCircle className="h-4 w-4" />
          <span>Checkout cancelled. Your current plan is unchanged.</span>
        </div>
      )}

      {/* Soft-launch billing banner */}
      <div className="mb-6 rounded-[10px] border border-brand-200/70 bg-brand-50/60 p-4 text-[13px] text-brand-900 lift-1">
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-brand-950">You&apos;re in the private beta</div>
            <p className="mt-1 text-brand-900/80">
              Card checkout opens with the public beta in a few weeks. During the
              private beta, plan upgrades are handled by manual invoice (bank
              transfer, Wise, or PayPal) so David can support setup personally
              for the first customer batch.
            </p>
          </div>
        </div>
      </div>

      {/* Current plan + usage */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="card-primary lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-2xs font-medium text-ink-500">Current plan</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="app-display">{current.name}</span>
                <span className="app-body text-ink-500">${current.monthly}/mo</span>
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={isTrialing ? 'badge-warn' : 'badge-success'}>
                  {isTrialing ? 'Trialing' : sub?.status ?? 'active'}
                </span>
                {sub?.currentPeriodEnd && (
                  <span className="app-meta inline-flex items-center gap-1 font-normal">
                    <Calendar className="h-3 w-3" />
                    {isTrialing ? 'Trial ends' : 'Renews'} {formatDate(sub.currentPeriodEnd)}
                    {isTrialing && trialDaysLeft > 0 && <b className="text-warn-700 ml-1">({trialDaysLeft} days)</b>}
                  </span>
                )}
                {sub?.cancelAt && (
                  <span className="badge-danger inline-flex items-center gap-1">
                    <X className="h-3 w-3" />Cancels {formatDate(sub.cancelAt)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {stripeConfigured && sub?.stripeCustomerId ? (
                <form action={openPortal}>
                  <button type="submit" className="btn-secondary btn-sm">
                    <ExternalLink className="h-3.5 w-3.5" />Manage in Stripe
                  </button>
                </form>
              ) : (
                <button disabled className="btn-secondary btn-sm opacity-60 cursor-not-allowed" title="Stripe not configured">
                  <ExternalLink className="h-3.5 w-3.5" />Manage in Stripe
                </button>
              )}
            </div>
          </div>

          {/* Usage meters */}
          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            <UsageMeter
              label="Invoices this month"
              used={invoiceCountThisMonth}
              limit="unlimited"
            />
            <UsageMeter
              label="Customers"
              used={customerCount}
              limit="unlimited"
            />
            <UsageMeter
              label="Client organizations"
              used={connectedIntegrations}
              limit={current.includedOrgs}
            />
          </div>
        </div>

        {/* Quick links */}
        <div className="section">
          <h2 className="app-heading mb-2">Resources</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/dashboard/invoices" className="link-quiet"><FileText className="h-3.5 w-3.5" />View invoices</Link></li>
            <li><Link href="/dashboard/payments" className="link-quiet"><CreditCard className="h-3.5 w-3.5" />View payments</Link></li>
            <li><a href="mailto:billing@getcollectly.app" className="link-quiet"><ExternalLink className="h-3.5 w-3.5" />Contact billing</a></li>
          </ul>
          <div className="mt-4 pt-4 border-t border-ink-100 text-xs text-ink-500">
            Questions about your plan? Email <a href="mailto:billing@getcollectly.app" className="text-brand-600">billing@getcollectly.app</a>.
          </div>
        </div>
      </div>

      {/* Plan switcher */}
      <div className="grid md:grid-cols-4 gap-3">
        {(['starter','growth','scale','enterprise'] as const).map((k) => {
          const p = PLAN_PRICING[k];
          const isCurrent = k === plan;
          return (
            <form action={upgrade} key={k}>
              <input type="hidden" name="plan" value={k} />
              <div className={`card relative h-full flex flex-col ${isCurrent ? 'ring-2 ring-brand-500' : ''} ${p.popular ? 'border-brand-300' : ''}`}>
                {isCurrent && <div className="absolute -top-3 right-4"><span className="badge-success">Current</span></div>}
                {p.popular && !isCurrent && <div className="absolute -top-3 right-4"><span className="badge-warn"><Sparkles className="h-3 w-3 mr-1" />Popular</span></div>}
                <div className="font-display font-semibold text-ink-900">{p.name}</div>
                <div className="mt-1 text-3xl font-display font-bold">${p.monthly}<span className="text-sm font-normal text-ink-500">/mo</span></div>
                <ul className="mt-4 space-y-1.5 text-sm text-ink-600 flex-1">
                  {p.features.map((f) => <li key={f} className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success-500 mt-0.5 flex-shrink-0" />{f}</li>)}
                </ul>
                <button disabled={isCurrent} className={`mt-4 w-full ${isCurrent ? 'btn-secondary opacity-50' : 'btn-primary'} text-sm`} type="submit">
                  {isCurrent ? 'Current plan' : <>Start {p.name} at ${p.monthly}/mo <ArrowUpRight className="h-3.5 w-3.5" /></>}
                </button>
              </div>
            </form>
          );
        })}
      </div>

      {/* Founder note about the manual flow */}
      <div className="mt-3 text-xs text-ink-500 text-center max-w-2xl mx-auto">
        Card checkout is coming soon. For the first customer batch, David handles
        upgrades manually by invoice (bank transfer, Wise, or PayPal) so he can
        support setup personally. Same price, same plan — just a 12-hour
        window between click and confirmation.
      </div>

      {/* Invoice history */}
      <div className="mt-8 card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="app-heading">Receipts & payments</h2>
            <p className="text-xs text-ink-500 mt-0.5">Customer payments you&apos;ve collected. Use these as proof of receipt for accounting.</p>
          </div>
          <Link href="/dashboard/payments" className="link-quiet">All payments →</Link>
        </div>
        {recentPayments.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-ink-300/70 bg-ink-50/40 p-10 text-center">
            <FileText className="h-8 w-8 text-ink-300 mx-auto" />
            <h2 className="app-heading mt-2">No payments yet</h2>
            <p className="mt-1 text-xs text-ink-600">When customers pay through your portal, receipts will appear here. Each row links to the original invoice.</p>
          </div>
        ) : (
          <div className="-mx-5 -mb-5 overflow-x-auto border-t border-ink-200">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Invoice</th>
                  <th>Method</th>
                  <th className="col-num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((r: typeof recentPayments[number]) => (
                  <tr key={r.payment.id}>
                    <td className="whitespace-nowrap text-ink-700">{r.payment.paidAt ? formatDate(r.payment.paidAt) : '—'}</td>
                    <td className="text-ink-950">{r.customer.name}</td>
                    <td className="font-mono text-2xs text-ink-500">{r.invoice.number}</td>
                    <td className="capitalize text-ink-600">{r.payment.method ?? 'ach'}</td>
                    <td className="col-num num-strong text-success-700">+{formatCurrency(Number(r.payment.amount), r.payment.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | 'unlimited' }) {
  const isUnlimited = limit === 'unlimited';
  const pct = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
  const isWarning = !isUnlimited && pct >= 80;
  const isDanger = !isUnlimited && pct >= 100;
  return (
    <div className="rounded-[10px] border border-[color:var(--hair)] bg-white p-3 lift-1">
      <div className="text-2xs font-medium text-ink-500">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-2xl font-display font-bold text-ink-950">{used}</span>
        {isUnlimited ? (
          <span className="text-xs text-ink-500">unlimited</span>
        ) : (
          <span className="text-xs text-ink-500">/ {limit}</span>
        )}
      </div>
      {!isUnlimited && (
        <div className="mt-2 h-1.5 rounded-full bg-ink-100 overflow-hidden">
          <div
            className={`h-full transition-all ${isDanger ? 'bg-danger-500' : isWarning ? 'bg-warn-400' : 'bg-success-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
