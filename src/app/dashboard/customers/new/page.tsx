import { AppShell } from '@/components/app/shell';
import { NewCustomerForm } from '@/components/customers/new-form';
import { getAuth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NewCustomerPage() {
  const { userId, orgId } = await getAuth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  return (
    <AppShell title="New customer" subtitle="Add a customer manually.">
      <NewCustomerForm />
    </AppShell>
  );
}
