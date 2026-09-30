export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { dunningRuns, invoices, customers } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { formatDate } from '@/lib/utils';

const STATUSES = ['scheduled', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'paid', 'failed', 'cancelled'] as const;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');
  const { status } = await searchParams;
  const active = status && (STATUSES as readonly string[]).includes(status) ? (status as (typeof STATUSES)[number]) : null;

  const rows = await db
    .select({ run: dunningRuns, customerId: customers.id, customer: customers.name, number: invoices.number })
    .from(dunningRuns)
    .innerJoin(invoices, eq(invoices.id, dunningRuns.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(active ? and(eq(dunningRuns.orgId, orgId), eq(dunningRuns.status, active)) : eq(dunningRuns.orgId, orgId))
    .orderBy(desc(dunningRuns.createdAt))
    .limit(200);

  const exportHref = `/api/dunning/runs/export${active ? `?status=${active}` : ''}`;
  return (
    <AppShell title="Reminder history" subtitle="Every reminder Mugavi has drafted, sent or skipped.">
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
        <Link href="/dashboard/dunning/history" className={`badge ${!active ? 'ring-1 ring-brand-500' : ''}`}>All</Link>
        {STATUSES.map((s) => <Link key={s} href={`/dashboard/dunning/history?status=${s}`} className={`badge capitalize ${active === s ? 'ring-1 ring-brand-500' : ''}`}>{s}</Link>)}
        <a href={exportHref} className="btn-secondary btn-sm ml-auto" download>Export CSV</a>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-ink-300/70 px-4 py-8 text-center app-meta">Nothing here yet. Reminders appear once the scheduler has drafted or sent one.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ink-200">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Reminder history, newest first</caption>
            <thead className="bg-ink-50 text-xs text-ink-600"><tr>
              <th scope="col" className="px-3 py-2">When</th><th scope="col" className="px-3 py-2">Customer</th><th scope="col" className="px-3 py-2">Invoice</th>
              <th scope="col" className="px-3 py-2">Channel</th><th scope="col" className="px-3 py-2">Status</th><th scope="col" className="px-3 py-2">Note</th>
            </tr></thead>
            <tbody>
              {rows.map((r: (typeof rows)[number]) => (
                <tr key={r.run.id} className="border-t border-ink-100 align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.run.sentAt ?? r.run.createdAt)}</td>
                  <td className="px-3 py-2"><Link href={`/dashboard/customers/${r.customerId}`} className="link">{r.customer}</Link></td>
                  <td className="px-3 py-2 font-mono text-xs">{r.number}</td>
                  <td className="px-3 py-2 capitalize">{r.run.channel}</td>
                  <td className="px-3 py-2 capitalize">{r.run.status}</td>
                  <td className="px-3 py-2 text-ink-600">{r.run.error ?? r.run.subject ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="app-meta mt-3 font-normal">Showing the latest 200. Export the CSV for up to 5,000.</p>
    </AppShell>
  );
}
