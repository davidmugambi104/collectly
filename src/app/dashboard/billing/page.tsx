export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { organizations, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CheckCircle2, Sparkles, ArrowUpRight } from 'lucide-react';
import { PLAN_PRICING } from '@/lib/utils';
import { createCheckoutSession } from '@/lib/billing';

export default async function BillingPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId)).limit(1);
  const plan = (sub?.plan ?? org?.plan ?? 'starter') as keyof typeof PLAN_PRICING;
  const current = PLAN_PRICING[plan];

  async function upgrade(form: FormData) {
    'use server';
    const target = String(form.get('plan') ?? '') as keyof typeof PLAN_PRICING;
    if (!target || !PLAN_PRICING[target]) return;
    const session = await createCheckoutSession({
      orgId: orgId!,
      plan: target,
      customerEmail: org?.slug ? `${org.slug}@collectly.app` : 'customer@collectly.app',
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?upgraded=1`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?cancelled=1`,
    });
    if (session.url) redirect(session.url);
  }

  return (
    <AppShell title="Billing" subtitle="Plans, invoices, and payment method.">
      <div className="grid md:grid-cols-4 gap-3">
        {(['starter','growth','scale','enterprise'] as const).map((k) => {
          const p = PLAN_PRICING[k];
          const isCurrent = k === plan;
          return (
            <form action={upgrade} key={k}>
              <input type="hidden" name="plan" value={k} />
              <div className={`card relative ${isCurrent ? 'ring-2 ring-brand-500' : ''} ${p.popular ? 'border-brand-300' : ''}`}>
                {isCurrent && <div className="absolute -top-3 right-4"><span className="badge-success">Current</span></div>}
                {p.popular && !isCurrent && <div className="absolute -top-3 right-4"><span className="badge-warn"><Sparkles className="h-3 w-3 mr-1" />Popular</span></div>}
                <div className="font-display font-semibold text-ink-900">{p.name}</div>
                <div className="mt-1 text-3xl font-display font-bold">${p.monthly}<span className="text-sm font-normal text-ink-500">/mo</span></div>
                <ul className="mt-4 space-y-1.5 text-sm text-ink-600">
                  {p.features.map((f) => <li key={f} className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />{f}</li>)}
                </ul>
                <button disabled={isCurrent} className={`mt-4 w-full ${isCurrent ? 'btn-secondary opacity-50' : 'btn-primary'} text-sm`} type="submit">
                  {isCurrent ? 'Current plan' : <>Switch to {p.name} <ArrowUpRight className="h-3.5 w-3.5" /></>}
                </button>
              </div>
            </form>
          );
        })}
      </div>

      <div className="mt-8 card">
        <h2 className="h3">Account</h2>
        <div className="mt-3 text-sm text-ink-600 space-y-1.5">
          <div>Plan: <b className="text-ink-900">{current.name}</b></div>
          <div>Status: <b className={sub?.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}>{sub?.status ?? 'trialing'}</b></div>
          {sub?.currentPeriodEnd && <div>Renews: <b>{new Date(sub.currentPeriodEnd).toLocaleDateString()}</b></div>}
        </div>
      </div>
    </AppShell>
  );
}
