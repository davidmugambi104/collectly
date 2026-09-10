export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { InvoicesTable } from '@/components/dashboard/invoices-table';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { invoices, customers } from '@/db/schema';
import { eq, sql, and, or, ilike } from 'drizzle-orm';
import Link from 'next/link';
import { Search, SearchX, Plus, FileText } from 'lucide-react';

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string; bucket?: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in');

  const sp = await searchParams;
  const filter = sp.filter ?? 'all';
  const q = (sp.q ?? '').trim();
  const bucket = sp.bucket ?? '';

  // Aging-bucket drill-down, so each row of the A/R aging legend on the
  // Overview goes somewhere real. Bounds are expressed in whole days past the
  // due date, matching daysOverdue()/bucketFor() in src/lib/utils.ts exactly —
  // if these two ever disagree, the chart and the list it links to will
  // disagree, which is the failure this filter exists to avoid.
  const BUCKET_RANGES: Record<string, { min: number; max: number | null }> = {
    current: { min: -100000, max: 0 },
    '1-30': { min: 1, max: 30 },
    '31-60': { min: 31, max: 60 },
    '61-90': { min: 61, max: 90 },
    '90+': { min: 91, max: null },
  };
  const range = BUCKET_RANGES[bucket];

  const unpaid = sql`${invoices.status} NOT IN ('paid', 'written_off')`;
  const daysPastDue = sql`FLOOR(EXTRACT(EPOCH FROM (NOW() - ${invoices.dueDate})) / 86400)`;

  // Build the base WHERE clause for the active filter
  const filterCond = range
    ? and(
        eq(invoices.orgId, orgId),
        unpaid,
        range.max === null
          ? sql`${daysPastDue} >= ${range.min}`
          : range.min <= 0
            // "current" is everything not yet past due.
            ? sql`${daysPastDue} <= 0`
            : sql`${daysPastDue} BETWEEN ${range.min} AND ${range.max}`,
      )
    : filter === 'overdue'
      ? and(eq(invoices.orgId, orgId), unpaid, sql`${invoices.dueDate} < NOW()`)
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

  const FILTERS = [
    { key: 'all', label: 'All', href: q ? `/dashboard/invoices?q=${encodeURIComponent(q)}` : '/dashboard/invoices' },
    { key: 'overdue', label: 'Overdue', href: `/dashboard/invoices?filter=overdue${q ? `&q=${encodeURIComponent(q)}` : ''}` },
    { key: 'paid', label: 'Paid', href: `/dashboard/invoices?filter=paid${q ? `&q=${encodeURIComponent(q)}` : ''}` },
  ];

  return (
    <AppShell
      title="Invoices"
      subtitle={`${filtered.length} invoice${filtered.length === 1 ? '' : 's'}${
        range ? ` · ${bucket === 'current' ? 'not yet due' : `${bucket} days past due`}` : ''
      }${q ? ` matching "${q}"` : ''}`}
    >
      {/* One toolbar on a single 32px baseline. This was five full-height
          `btn text-sm` controls in a row — the shrink-the-label-not-the-padding
          pattern — with the three view filters looking exactly as clickable as
          the two actions beside them. The filters are one control now (a
          segmented switch: mutually exclusive, one visibly selected), which
          leaves search on the left and the only real action on the right. */}
      <form action="/dashboard/invoices" method="get" className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72 sm:flex-none">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search invoice #, customer, email..."
              className="input h-8 py-0 pl-9 text-[13px]"
              aria-label="Search invoices"
            />
          </div>
          <button type="submit" className="btn-secondary btn-sm h-8">Search</button>
        </div>
        <div className="flex items-center gap-2">
          {/* Links, so aria-current carries the selected view rather than
              aria-pressed, which a link cannot honestly claim. */}
          <div className="segmented">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <Link
                  key={f.key}
                  href={f.href}
                  aria-current={active ? 'page' : undefined}
                  className={`segmented-item h-7 ${active ? 'bg-white text-ink-950 lift-1' : ''}`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
          <Link href="/dashboard/invoices/new" className="btn-brand btn-sm h-8"><Plus aria-hidden="true" className="h-3.5 w-3.5" />New invoice</Link>
        </div>
      </form>

      {filtered.length === 0 ? (
        /* Two different empty states, because they are two different problems:
           a search that matched nothing needs the search cleared, an org with no
           data needs the import. Both get the same shape — a mark, one line of
           explanation, and the action that resolves it. */
        <div className="panel px-6 py-16 text-center">
          <div className="chip-icon mx-auto h-11 w-11">
            {q ? (
              <SearchX aria-hidden="true" className="h-5 w-5 text-ink-400" />
            ) : (
              <FileText aria-hidden="true" className="h-5 w-5 text-brand-500" />
            )}
          </div>
          {q ? (
            <>
              <h2 className="app-heading mt-4">No invoices matching &quot;{q}&quot;</h2>
              <p className="app-body mx-auto mt-1.5 max-w-sm text-ink-500">
                Search covers invoice number, customer name, email and amount across the whole workspace.
              </p>
              <div className="mt-5">
                <Link href="/dashboard/invoices" className="btn-secondary btn-sm h-8">Clear search</Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="app-heading mt-4">No invoices yet</h2>
              <p className="app-body mx-auto mt-1.5 max-w-sm text-ink-500">
                Connect QuickBooks or Xero to import your open receivables, or add the first one by hand.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Link href="/dashboard/integrations" className="btn-primary btn-sm h-8">Connect QuickBooks or Xero</Link>
                <Link href="/dashboard/invoices/new" className="btn-secondary btn-sm h-8"><Plus aria-hidden="true" className="h-3.5 w-3.5" />New invoice</Link>
              </div>
            </>
          )}
        </div>
      ) : (
        <InvoicesTable rows={filtered} />
      )}
    </AppShell>
  );
}
