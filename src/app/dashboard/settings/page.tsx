export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { DeleteAccountCard } from './delete-account-card';

export default async function SettingsPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);

  async function save(form: FormData) {
    'use server';
    await db.update(organizations).set({
      name: String(form.get('name') ?? ''),
      country: String(form.get('country') ?? 'US'),
      baseCurrency: String(form.get('currency') ?? 'USD'),
      timezone: String(form.get('timezone') ?? 'UTC'),
      businessType: String(form.get('businessType') ?? ''),
      updatedAt: new Date(),
    }).where(eq(organizations.id, orgId!));
    revalidatePath('/dashboard/settings');
  }

  return (
    <AppShell title="Settings" subtitle="Workspace, brand, and defaults.">
      <form action={save} className="card max-w-2xl space-y-5">
        <div>
          <label className="label">Business name</label>
          <input name="name" defaultValue={org?.name ?? ''} className="input" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Country</label>
            <select name="country" defaultValue={org?.country ?? 'US'} className="input">
              {['US','GB','AU','CA','IE','NZ','KE','NG','ZA','IN'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Base currency</label>
            <select name="currency" defaultValue={org?.baseCurrency ?? 'USD'} className="input">
              {['USD','GBP','AUD','CAD','EUR','KES','NGN','ZAR','INR'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Timezone</label>
            <input name="timezone" defaultValue={org?.timezone ?? 'UTC'} className="input" />
          </div>
          <div>
            <label className="label">Business type</label>
            <input name="businessType" defaultValue={org?.businessType ?? ''} placeholder="e.g. design agency, B2B SaaS, consulting" className="input" />
          </div>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary">Save changes</button>
        </div>
      </form>

      <div className="mt-8">
        <DeleteAccountCard orgName={org?.name ?? ''} />
      </div>
    </AppShell>
  );
}
