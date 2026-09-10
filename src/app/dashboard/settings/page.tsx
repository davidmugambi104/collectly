export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth, requireOrgId } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { DeleteAccountCard } from './delete-account-card';

/* Named field group. Settings pages are the place a flat label-over-input stack
   hurts most: every row looks equally consequential, so renaming the business
   and changing the base currency of the ledger read the same. A titled group
   with its own one-line description on the left gives each field a context to
   be judged in, and the hairline between groups is the only chrome needed. */
function Section({
  title, hint, children,
}: {
  title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="grid gap-x-8 gap-y-3 border-t border-ink-100 py-5 first:border-t-0 first:pt-0 md:grid-cols-[190px_minmax(0,1fr)]">
      <div>
        <h2 className="app-label">{title}</h2>
        {hint && <p className="app-meta mt-1 font-normal">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default async function SettingsPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);

  async function save(form: FormData) {
    'use server';
    // Re-derive the session inside the action — the page-render guard above
    // does not protect this POST endpoint. See requireOrgId in auth-helper.
    const actorOrgId = await requireOrgId();
    if (!actorOrgId) return;
    await db.update(organizations).set({
      name: String(form.get('name') ?? ''),
      country: String(form.get('country') ?? 'US'),
      baseCurrency: String(form.get('currency') ?? 'USD'),
      timezone: String(form.get('timezone') ?? 'UTC'),
      businessType: String(form.get('businessType') ?? ''),
      updatedAt: new Date(),
    }).where(eq(organizations.id, actorOrgId));
    revalidatePath('/dashboard/settings');
  }

  return (
    <AppShell title="Settings" subtitle="Workspace, brand, and defaults.">
      {/* `.panel` (a lit surface with no padding of its own) so the save bar can
          run full-bleed along the foot of the form. */}
      <form action={save} className="panel max-w-3xl">
        <div className="px-6 pt-6">
          <Section title="Workspace" hint="The name this business is invoiced under.">
            <label htmlFor="org-name" className="label">Business name</label>
            <input id="org-name" name="name" defaultValue={org?.name ?? ''} className="input" required />
          </Section>

          <Section title="Locale" hint="Country, currency, and timezone for this workspace.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="org-country" className="label">Country</label>
                <select id="org-country" name="country" defaultValue={org?.country ?? 'US'} className="input">
                  {['US','GB','AU','CA','IE','NZ','KE','NG','ZA','IN'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="org-currency" className="label">Base currency</label>
                <select id="org-currency" name="currency" defaultValue={org?.baseCurrency ?? 'USD'} className="input">
                  {['USD','GBP','AUD','CAD','EUR','KES','NGN','ZAR','INR'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="org-timezone" className="label">Timezone</label>
                <input id="org-timezone" name="timezone" defaultValue={org?.timezone ?? 'UTC'} className="input" />
              </div>
            </div>
          </Section>

          <Section title="Profile" hint="How you describe the business.">
            <label htmlFor="org-business-type" className="label">
              Business type <span className="ml-1 font-normal text-ink-400">Optional</span>
            </label>
            <input
              id="org-business-type"
              name="businessType"
              defaultValue={org?.businessType ?? ''}
              placeholder="e.g. design agency, B2B SaaS, consulting"
              className="input"
            />
          </Section>
        </div>

        {/* Save sits in the same recessed foot as every other form in the
            product, so muscle memory carries between them. */}
        <div className="flex border-t border-ink-200/70 bg-ink-50/70 px-6 py-4 sm:justify-end">
          <button className="btn-primary w-full justify-center sm:w-auto">Save changes</button>
        </div>
      </form>

      {/* Irreversible actions live below the fold of the form, behind a rule and
          real whitespace — far enough from Save that no one arrives here by
          momentum. */}
      <div className="mt-10 max-w-3xl border-t border-ink-200 pt-8">
        <DeleteAccountCard orgName={org?.name ?? ''} />
      </div>
    </AppShell>
  );
}
