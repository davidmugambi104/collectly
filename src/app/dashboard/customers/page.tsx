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
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-ink-600">Sorted by risk score (highest first). AI-recommended next action for each.</p>
        <Link href="/dashboard/customers/new" className="btn-brand text-sm"><Plus className="h-3.5 w-3.5" />Add customer</Link>
      </div>
      {insights.length === 0 ? (
        <div className="card text-center py-12">
          <Sparkles className="h-8 w-8 mx-auto text-ink-300" />
          <h3 className="mt-3 font-semibold text-ink-900">No open balances</h3>
          <p className="mt-1 text-sm text-ink-600">All your customers are paid up. Add an invoice or import data to see insights.</p>
        </div>
      ) : (
        <CustomersTable insights={insights} noDebt={noDebt} />
      )}
    </AppShell>
  );
}
