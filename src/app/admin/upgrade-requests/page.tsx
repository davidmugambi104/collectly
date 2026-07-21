export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { db } from '@/db';
import { upgradeRequests } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { CheckCircle2, X, Mail, Building2, Globe, Calendar, MessageSquare } from 'lucide-react';
import { formatDate, PLAN_PRICING } from '@/lib/utils';

// Admin emails allowed to view this page.
// Add your own email here.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'davie@getcollectly.app').split(',').map(e => e.trim().toLowerCase());

async function markStatus(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['pending', 'invoiced', 'paid', 'cancelled'].includes(status)) return;
  await db.update(upgradeRequests).set({ status, updatedAt: new Date() }).where(eq(upgradeRequests.id, id));
}

export default async function AdminUpgradeRequestsPage() {
  // Auth check — must be a logged-in admin
  const { getAuth } = await import('@/lib/auth-helper');
  const { db: dbClient } = await import('@/db');
  const { users } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  const { userId } = await getAuth();
  if (!userId) redirect('/sign-in');
  const [u] = await dbClient.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const userEmail = u?.email?.toLowerCase();
  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="h2">Not authorized</h1>
          <p className="mt-3 text-ink-600">This page is for the Collectly team only. If you should have access, ask Davie to add <code className="font-mono text-xs bg-ink-100 px-1.5 py-0.5 rounded">{userEmail ?? 'your email'}</code> to <code className="font-mono text-xs bg-ink-100 px-1.5 py-0.5 rounded">ADMIN_EMAILS</code>.</p>
        </div>
      </div>
    );
  }

  const requests: Array<typeof upgradeRequests.$inferSelect> = await db
    .select()
    .from(upgradeRequests)
    .orderBy(desc(upgradeRequests.createdAt))
    .limit(100);

  const pending = requests.filter((r: typeof upgradeRequests.$inferSelect) => r.status === 'pending');
  const others = requests.filter((r: typeof upgradeRequests.$inferSelect) => r.status !== 'pending');

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="container-page py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="h1">Upgrade requests</h1>
            <p className="mt-2 text-ink-600">Private beta — these come in via the soft-launch flow. Davie reviews and invoices manually.</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-display font-bold text-ink-950">{pending.length}</div>
            <div className="text-xs text-ink-500 uppercase tracking-wider font-medium">Pending</div>
          </div>
        </div>

        {pending.length === 0 && others.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-ink-500">No upgrade requests yet. When someone clicks a "Request {PLAN_PRICING.growth.name}" button on /dashboard/billing, it'll show up here.</p>
          </div>
        )}

        {pending.length > 0 && (
          <section className="mb-8">
            <h2 className="h2 mb-3">Pending ({pending.length})</h2>
            <div className="space-y-3">
              {pending.map((r) => {
                const planInfo = PLAN_PRICING[r.plan as keyof typeof PLAN_PRICING];
                return (
                  <div key={r.id} className="card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Building2 className="h-4 w-4 text-ink-500" />
                          <span className="font-display font-bold text-ink-950">{r.businessName ?? r.customerEmail}</span>
                          <span className="badge-warn">→ {planInfo?.name ?? r.plan}</span>
                          <span className="badge">${planInfo?.monthly ?? '?'}/mo</span>
                        </div>
                        <div className="mt-2 flex items-center gap-3 flex-wrap text-sm text-ink-600">
                          <a href={`mailto:${r.customerEmail}`} className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"><Mail className="h-3.5 w-3.5" />{r.customerEmail}</a>
                          {r.country && <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{r.country}</span>}
                          {r.customerName && <span>{r.customerName}</span>}
                          <span className="inline-flex items-center gap-1 text-ink-500"><Calendar className="h-3.5 w-3.5" />{formatDate(r.createdAt)}</span>
                        </div>
                        {r.notes && (
                          <div className="mt-3 rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
                            <div className="text-xs text-ink-500 uppercase tracking-wider font-medium mb-1 inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />Notes</div>
                            {r.notes}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-ink-400 font-mono">ID: {r.id}</div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <form action={markStatus}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="invoiced" />
                          <button type="submit" className="btn-primary text-sm whitespace-nowrap">
                            <CheckCircle2 className="h-3.5 w-3.5" />Mark invoiced
                          </button>
                        </form>
                        <form action={markStatus}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="cancelled" />
                          <button type="submit" className="btn-secondary text-sm whitespace-nowrap">
                            <X className="h-3.5 w-3.5" />Cancel
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section>
            <h2 className="h2 mb-3">Archive ({others.length})</h2>
            <div className="overflow-x-auto card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 text-xs uppercase tracking-wider">
                    <th className="pb-2 pr-4">When</th>
                    <th className="pb-2 px-4">Business</th>
                    <th className="pb-2 px-4">Plan</th>
                    <th className="pb-2 px-4">Email</th>
                    <th className="pb-2 px-4">Country</th>
                    <th className="pb-2 pl-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {others.map((r) => (
                    <tr key={r.id} className="border-t border-ink-100">
                      <td className="py-2.5 pr-4 text-ink-700 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="py-2.5 px-4 text-ink-900 font-medium">{r.businessName ?? '—'}</td>
                      <td className="py-2.5 px-4">{PLAN_PRICING[r.plan as keyof typeof PLAN_PRICING]?.name ?? r.plan}</td>
                      <td className="py-2.5 px-4 text-xs"><a href={`mailto:${r.customerEmail}`} className="text-brand-600 hover:text-brand-700">{r.customerEmail}</a></td>
                      <td className="py-2.5 px-4 text-xs text-ink-600">{r.country ?? '—'}</td>
                      <td className="py-2.5 pl-4">
                        <span className={`badge ${r.status === 'paid' ? 'badge-success' : r.status === 'cancelled' ? 'badge-danger' : 'badge-warn'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="mt-8 text-xs text-ink-500 text-center">
          Showing latest 100.
        </div>
      </div>
    </div>
  );
}
