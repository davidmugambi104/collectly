export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { organizations, subscriptions, customers, invoices, payments } from '@/db/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { CheckCircle2, Sparkles, ArrowUpRight, CreditCard, Calendar, AlertCircle, Download, ExternalLink, FileText, X } from 'lucide-react';
import { PLAN_PRICING, formatCurrency, formatDate } from '@/lib/utils';
import { createCustomerPortal, recordUpgradeRequest } from '@/lib/billing';
import Link from 'next/link';

// Per-plan limits. Parsed from PLAN_PRICING.features for display.
const PLAN_LIMITS: Record<string, { invoices: number | 'unlimited'; users: number | 'unlimited'; integrations: number | 'unlimited' }> = {
  starter:    { invoices: 50,         users: 1,         integrations: 1 },
  growth:     { invoices: 'unlimited', users: 3,        integrations: 3 },
  scale:      { invoices: 'unlimited', users: 'unlimited', integrations: 10 },
  enterprise: { invoices: 'unlimited', users: 'unlimited', integrations: 'unlimited' },
};

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
  const current = PLAN_PRICING[plan];
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;

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
    const target = String(form.get('plan') ?? '') as keyof typeof PLAN_PRICING;
    if (!target || !PLAN_PRICING[target]) return;
    // Soft-launch flow: record the upgrade request, notify Davie, show confirmation.
    // Replaced by Stripe checkout redirect once Stripe Atlas is set up.
    const { recordUpgradeRequest } = await import('@/lib/billing');
    const result = await recordUpgradeRequest({
      orgId: orgId!,
      plan: target,
    });
    redirect(`/dashboard/billing?requested=1&plan=${target}&req=${result.requestId}`);
  }

  async function openPortal() {
    'use server';
    try {
      const session = await createCustomerPortal(
        orgId!,
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
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          <span>Upgrade request received for the <b>{PLAN_PRICING[sp.plan as keyof typeof PLAN_PRICING]?.name ?? sp.plan}</b> plan. We'll email you within 1 business day with a manual invoice and onboarding link.</span>
        </div>
      )}
      {justUpgraded && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          <span>Plan upgraded. Welcome to {current.name}.</span>
        </div>
      )}
      {justCancelled && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4" />
          <span>Checkout cancelled. Your current plan is unchanged.</span>
        </div>
      )}

      {/* Soft-launch billing banner */}
      <div className="mb-5 rounded-lg border border-brand-200 bg-brand-50/60 p-4 text-sm text-brand-900">
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-brand-950">You're in the private beta</div>
            <p className="mt-1 text-brand-900/80">
              All plans are <b>free during the beta</b>. When you click <i>Switch to {PLAN_PRICING.growth.name === current.name ? PLAN_PRICING.starter.name : PLAN_PRICING.growth.name}</i>, you'll get a confirmation here and we'll email you within 1 business day with a manual invoice (bank transfer, Wise, or PayPal) for the first month. Online card checkout opens when the public beta launches in a few weeks.
            </p>
          </div>
        </div>
      </div>

      {/* Current plan + usage */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-ink-500 uppercase tracking-wider font-medium">Current plan</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-display font-bold text-ink-950">{current.name}</span>
                <span className="text-sm text-ink-500">${current.monthly}/mo</span>
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`badge ${isTrialing ? 'badge-warn' : 'badge-success'}`}>
                  {isTrialing ? 'Trialing' : sub?.status ?? 'active'}
                </span>
                {sub?.currentPeriodEnd && (
                  <span className="text-xs text-ink-500 inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {isTrialing ? 'Trial ends' : 'Renews'} {formatDate(sub.currentPeriodEnd)}
                    {isTrialing && trialDaysLeft > 0 && <b className="text-amber-700 ml-1">({trialDaysLeft} days)</b>}
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
                  <button type="submit" className="btn-secondary text-sm">
                    <ExternalLink className="h-3.5 w-3.5" />Manage in Stripe
                  </button>
                </form>
              ) : (
                <button disabled className="btn-secondary text-sm opacity-60 cursor-not-allowed" title="Stripe not configured">
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
              limit={limits.invoices}
            />
            <UsageMeter
              label="Customers"
              used={customerCount}
              limit={limits.users === 'unlimited' ? 'unlimited' : customerCount <= (limits.users as number) ? 'unlimited' : 'unlimited'}
            />
            <UsageMeter
              label="Integrations"
              used={connectedIntegrations}
              limit={limits.integrations}
            />
          </div>
        </div>

        {/* Quick links */}
        <div className="card">
          <h3 className="font-semibold text-ink-900 text-sm">Resources</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/dashboard/invoices" className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />View invoices</Link></li>
            <li><Link href="/dashboard/payments" className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" />View payments</Link></li>
            <li><a href="mailto:billing@getcollectly.app" className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1.5"><ExternalLink className="h-3.5 w-3.5" />Contact billing</a></li>
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
                  {p.features.map((f) => <li key={f} className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />{f}</li>)}
                </ul>
                <button disabled={isCurrent} className={`mt-4 w-full ${isCurrent ? 'btn-secondary opacity-50' : 'btn-primary'} text-sm`} type="submit">
                  {isCurrent ? 'Current plan' : <>Request {p.name} <ArrowUpRight className="h-3.5 w-3.5" /></>}
                </button>
              </div>
            </form>
          );
        })}
      </div>

      {/* Invoice history */}
      <div className="mt-8 card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="h3">Receipts & payments</h2>
            <p className="text-xs text-ink-500 mt-0.5">Customer payments you've collected. Use these as proof of receipt for accounting.</p>
          </div>
          <Link href="/dashboard/payments" className="text-sm text-brand-600 hover:text-brand-700">All payments →</Link>
        </div>
        {recentPayments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 p-8 text-center">
            <FileText className="h-8 w-8 text-ink-300 mx-auto" />
            <h3 className="mt-2 font-semibold text-ink-900 text-sm">No payments yet</h3>
            <p className="mt-1 text-xs text-ink-600">When customers pay through your portal, receipts will appear here. Each row links to the original invoice.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 text-xs uppercase tracking-wider">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 px-4">Customer</th>
                  <th className="pb-2 px-4">Invoice</th>
                  <th className="pb-2 px-4">Method</th>
                  <th className="pb-2 pl-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((r: typeof recentPayments[number]) => (
                  <tr key={r.payment.id} className="border-t border-ink-100">
                    <td className="py-2.5 pr-4 text-ink-700">{r.payment.paidAt ? formatDate(r.payment.paidAt) : '—'}</td>
                    <td className="py-2.5 px-4 text-ink-900">{r.customer.name}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-ink-700">{r.invoice.number}</td>
                    <td className="py-2.5 px-4 text-xs text-ink-600 capitalize">{r.payment.method ?? 'ach'}</td>
                    <td className="py-2.5 pl-4 text-right font-mono font-semibold text-emerald-700">+{formatCurrency(Number(r.payment.amount), r.payment.currency)}</td>
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
    <div className="rounded-lg border border-ink-200 p-3">
      <div className="text-xs text-ink-500 uppercase tracking-wider font-medium">{label}</div>
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
            className={`h-full transition-all ${isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
