export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { getAuth, requireAdminEmail } from '@/lib/auth-helper';
import { upgradeRequests } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { CheckCircle2, X, Mail, Building2, Globe, Calendar, MessageSquare } from 'lucide-react';
import { formatDate, PLAN_PRICING } from '@/lib/utils';

// SECURITY: markStatus is a Next.js Server Action — its own POST endpoint,
// callable independent of whether this page's body ever rendered for the
// caller. It previously had NO auth check of its own at all (only
// validated that `id` was non-empty and `status` was one of four literal
// strings), relying entirely on the page component's render-time gate
// below — which does not protect a server action. Any authenticated
// non-admin user who could reach this action reference could flip any
// upgrade request to paid/cancelled/invoiced for any org. requireAdminEmail()
// is now the single shared admin check (previously this page also kept
// its own separate, slightly-different copy of the ADMIN_EMAILS parsing
// logic — the exact kind of drift that caused the interviews-page
// cross-tenant leak fixed earlier this session).
async function markStatus(formData: FormData) {
  'use server';
  const admin = await requireAdminEmail();
  if (!admin.ok) return;
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['pending', 'invoiced', 'paid', 'cancelled'].includes(status)) return;
  await db.update(upgradeRequests).set({ status, updatedAt: new Date() }).where(eq(upgradeRequests.id, id));
}

export default async function AdminUpgradeRequestsPage() {
  // Auth check — must be a logged-in admin. Same helper the markStatus
  // action uses, so the page and the mutation can't drift apart.
  const { userId } = await getAuth();
  if (!userId) redirect('/sign-in');
  const admin = await requireAdminEmail();
  const userEmail = admin.email;
  if (!admin.ok) {
    return (
      <div className="app min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="app-title">Not authorized</h1>
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
    <div className="app min-h-screen bg-ink-50">
      <div className="container-page py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="app-display">Upgrade requests</h1>
            <p className="mt-2 text-ink-600">Private beta — these come in via the soft-launch flow. Davie reviews and invoices manually.</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-display font-bold text-ink-950">{pending.length}</div>
            <div className="app-meta">Pending</div>
          </div>
        </div>

        {pending.length === 0 && others.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-ink-500">No upgrade requests yet. When someone clicks a &quot;Request {PLAN_PRICING.growth.name}&quot; button on /dashboard/billing, it&apos;ll show up here.</p>
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
                            <div className="app-meta mb-1 inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />Notes</div>
                            {r.notes}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-ink-400 font-mono">ID: {r.id}</div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <form action={markStatus}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="invoiced" />
                          <button type="submit" className="btn-primary btn-sm whitespace-nowrap">
                            <CheckCircle2 className="h-3.5 w-3.5" />Mark invoiced
                          </button>
                        </form>
                        <form action={markStatus}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="cancelled" />
                          <button type="submit" className="btn-secondary btn-sm whitespace-nowrap">
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
            <h2 className="app-heading mb-3">Archive ({others.length})</h2>
            <div className="panel overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Business</th>
                    <th>Plan</th>
                    <th>Email</th>
                    <th>Country</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {others.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap text-ink-700">{formatDate(r.createdAt)}</td>
                      <td className="font-medium text-ink-950">{r.businessName ?? '—'}</td>
                      <td className="text-ink-700">{PLAN_PRICING[r.plan as keyof typeof PLAN_PRICING]?.name ?? r.plan}</td>
                      <td><a href={`mailto:${r.customerEmail}`} className="link-quiet">{r.customerEmail}</a></td>
                      <td className="text-ink-600">{r.country ?? '—'}</td>
                      <td>
                        <span className={r.status === 'paid' ? 'badge-success' : r.status === 'cancelled' ? 'badge-danger' : 'badge-warn'}>
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