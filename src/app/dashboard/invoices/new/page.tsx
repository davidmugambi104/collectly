import { AppShell } from '@/components/app/shell';
import { getAuth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db, schema } from '@/db/client';
import { customers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NewInvoiceForm } from '@/components/invoices/new-form';

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage() {
  const { userId, orgId } = await getAuth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const list = await db.select({ id: customers.id, name: customers.name, email: customers.email }).from(customers).where(eq(customers.orgId, orgId));

  return (
    <AppShell title="New invoice" subtitle="Create a manual invoice.">
      <NewInvoiceForm customers={list} />
    </AppShell>
  );
}
