export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { InvoicesTable } from '@/components/dashboard/invoices-table';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { invoices, customers } from '@/db/schema';
import { eq, sql, and, or, ilike } from 'drizzle-orm';
import Link from 'next/link';
import { Search, Filter, Download, Plus } from 'lucide-react';

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const sp = await searchParams;
  const filter = sp.filter ?? 'all';
  const q = (sp.q ?? '').trim();

  // Build the base WHERE clause for the active filter
  const filterCond =
    filter === 'overdue'
      ? and(eq(invoices.orgId, orgId), sql`${invoices.dueDate} < NOW()`)
      : filter === 'paid'
      ? and(eq(invoices.orgId, orgId), eq(invoices.status, 'paid'))
      : eq(invoices.orgId, orgId);

  // Push the search query into SQL so it searches the *entire* org, not just
  // the first 100 rows. ilike is case-insensitive in Postgres. When `q` is
  // present we use ILIKE across invoice number, customer name/email/company
  // and amount (so "1,200" or "1200.50" still matches). When absent we keep
  // the original 100-row recent-invoices cap.
  const where = q
    ? and(
        filterCond,
        or(
          ilike(invoices.number, `%${q}%`),
          ilike(customers.name, `%${q}%`),
          ilike(customers.email, `%${q}%`),
          ilike(customers.company, `%${q}%`),
          // numeric search: strip common formatting
          sql`${invoices.amount}::text ILIKE ${`%${q.replace(/[,\s$]/g, '')}%`}`,
        ),
      )
    : filterCond;

  const limit = q ? 500 : 100;
  const rows = await db
    .select({ invoice: invoices, customer: customers })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(where)
    .orderBy(invoices.dueDate)
    .limit(limit);

  // No more post-fetch JS filter — the SQL already handled it.
  const filtered = rows;

  return (
    <AppShell title="Invoices" subtitle={`${filtered.length} invoice${filtered.length === 1 ? '' : 's'}${q ? ` matching "${q}"` : ''}`}>
      <form action="/dashboard/invoices" method="get" className="flex flex-col sm:flex-row gap-3 mb-5">
        {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input name="q" defaultValue={q} placeholder="Search invoice #, customer, email..." className="input pl-9" aria-label="Search invoices" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={q ? `/dashboard/invoices?q=${encodeURIComponent(q)}` : '/dashboard/invoices'} className={`btn text-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}>All</Link>
          <Link href={`/dashboard/invoices?filter=overdue${q ? `&q=${encodeURIComponent(q)}` : ''}`} className={`btn text-sm ${filter === 'overdue' ? 'btn-primary' : 'btn-secondary'}`}>Overdue</Link>
          <Link href={`/dashboard/invoices?filter=paid${q ? `&q=${encodeURIComponent(q)}` : ''}`} className={`btn text-sm ${filter === 'paid' ? 'btn-primary' : 'btn-secondary'}`}>Paid</Link>
          <button type="submit" className="btn-secondary text-sm">Search</button>
          <a href="/dashboard/invoices/new" className="btn-brand text-sm"><Plus className="h-3.5 w-3.5" />New invoice</a>
        </div>
      </form>

      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-ink-500">
          {q ? (
            <>No invoices matching <b>"{q}"</b>. <Link href="/dashboard/invoices" className="link">Clear search</Link></>
          ) : (
            <>No invoices yet. <Link href="/dashboard/integrations" className="link">Connect QuickBooks or Xero</Link> to import.</>
          )}
        </div>
      ) : (
        <InvoicesTable rows={filtered} />
      )}
    </AppShell>
  );
}
