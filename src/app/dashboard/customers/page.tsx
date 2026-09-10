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
import { Plus, Sparkles } from 'lucide-react';

export default async function CustomersPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  // Use the AI insights engine for risk + recommendation
  const insights = await getCustomerInsights(orgId, 100);
  const custList = await db.select().from(customers).where(eq(customers.orgId, orgId));
  new Map(custList.map((c: typeof custList[number]) => [c.id, c]));
  const insightMap = new Map(insights.map((i) => [i.customerId, i]));

  // Customers with no open invoices
  const noDebt = custList.filter((c: typeof custList[number]) => !insightMap.has(c.id));

  return (
    <AppShell title="Customers" subtitle={`${custList.length} customer${custList.length === 1 ? '' : 's'} · ${insights.length} with open balance`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="app-body text-ink-500">Sorted by risk score (highest first). AI-recommended next action for each.</p>
        <Link href="/dashboard/customers/new" className="btn-brand btn-sm h-8"><Plus aria-hidden="true" className="h-3.5 w-3.5" />Add customer</Link>
      </div>
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
        <CustomersTable insights={insights} noDebt={noDebt} />
      )}
    </AppShell>
  );
}
