export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { AppShell } from '@/components/app/shell';
import { CustomersTable } from '@/components/dashboard/customers-table';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCustomerInsights } from '@/lib/analytics';
import { Plus, Sparkles, AlertTriangle } from 'lucide-react';
import { reminderGaps, type ReminderGap } from '@/lib/reminder-gaps';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ issue?: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');
  const { issue } = await searchParams;

  // Use the AI insights engine for risk + recommendation
  const insights = await getCustomerInsights(orgId, 100);
  const custList = await db.select().from(customers).where(eq(customers.orgId, orgId));
  const insightMap = new Map(insights.map((i) => [i.customerId, i]));

  // Customers with no open invoices
  const noDebt = custList.filter((c: typeof custList[number]) => !insightMap.has(c.id));

  // Customers who owe money but cannot be reminded: no email, or unsubscribed.
  const gaps: Record<string, ReminderGap[]> = {};
  for (const c of custList as Array<{ id: string; email: string | null; phone: string | null; dndAt: Date | null; preferredChannel: string | null }>) {
    if (!insightMap.has(c.id)) continue;
    const g = reminderGaps(c);
    if (g.length) gaps[c.id] = g;
  }
  const stuck = Object.keys(gaps).length;
  const onlyStuck = issue === 'cant-remind';
  const shown = onlyStuck ? insights.filter((i) => gaps[i.customerId]) : insights;

  return (
    <AppShell title="Customers" subtitle={`${custList.length} customer${custList.length === 1 ? '' : 's'} · ${insights.length} with open balance`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="app-body text-ink-500">Sorted by risk score (highest first). AI-recommended next action for each.</p>
        <Link href="/dashboard/customers/new" className="btn-brand btn-sm h-8"><Plus aria-hidden="true" className="h-3.5 w-3.5" />Add customer</Link>
      </div>
      {(stuck > 0 || onlyStuck) && (
        <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter customers">
          <Link href="/dashboard/customers" aria-current={!onlyStuck ? 'page' : undefined} className={`badge ${!onlyStuck ? 'ring-1 ring-brand-500' : ''}`}>All ({insights.length})</Link>
          <Link href="/dashboard/customers?issue=cant-remind" aria-current={onlyStuck ? 'page' : undefined} className={`badge inline-flex items-center gap-1 ${onlyStuck ? 'ring-1 ring-brand-500' : ''}`}>
            <AlertTriangle aria-hidden="true" className="h-3 w-3 text-warn-600" />Can&apos;t be reminded ({stuck})
          </Link>
          {stuck > 0 && <span className="app-meta font-normal">They owe money but have no email, or unsubscribed. Fix the email on the customer page.</span>}
        </div>
      )}
      {insights.length === 0 ? (
        /* "Nothing outstanding" is good news on this screen, so the state says
           so and then offers the two things that would give it something to
           analyse — the same shape as every other empty state in the app. */
        <div className="panel px-6 py-16 text-center">
          <div className="chip-icon mx-auto h-11 w-11">
            <Sparkles aria-hidden="true" className="h-5 w-5 text-brand-500" />
          </div>
          <h2 className="app-heading mt-4">No open balances</h2>
          <p className="app-body mx-auto mt-1.5 max-w-sm text-ink-500">
            All your customers are paid up. Add an invoice or import data to see insights.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link href="/dashboard/invoices/new" className="btn-primary btn-sm h-8"><Plus aria-hidden="true" className="h-3.5 w-3.5" />New invoice</Link>
            <Link href="/dashboard/integrations" className="btn-secondary btn-sm h-8">Import data</Link>
          </div>
        </div>
      ) : (
        <CustomersTable insights={shown} noDebt={onlyStuck ? [] : noDebt} gaps={gaps} />
      )}
    </AppShell>
  );
}
