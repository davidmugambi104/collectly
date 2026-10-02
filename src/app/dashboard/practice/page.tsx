export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app/shell';
import { OpenBookButton } from '@/components/app/open-book-button';
import { getAuth as auth } from '@/lib/auth-helper';
import { loadBooks } from '@/lib/practice-load';
import { rankBooks, totalBooks, type Money } from '@/lib/practice';
import { formatCurrency, PRACTICE_INCLUDED_ORGS, PRACTICE_EXTRA_ORG_MONTHLY } from '@/lib/utils';
import { practiceBillingNote } from '@/lib/practice-copy';

function MoneyLines({ money, field }: { money: Money; field: 'outstanding' | 'overdue' }) {
  const rows = Object.entries(money).filter(([, v]) => v[field] > 0);
  if (rows.length === 0) return <span className="text-ink-500">None</span>;
  return <>{rows.map(([cur, v]) => <div key={cur}>{formatCurrency(v[field], cur)}</div>)}</>;
}

export default async function PracticePage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  let loaded: Awaited<ReturnType<typeof loadBooks>> | null = null;
  try { loaded = await loadBooks(userId); } catch { loaded = null; }
  if (loaded === null) {
    return (
      <AppShell title="Client books" subtitle="Could not load your books">
        <p role="alert" className="card-primary text-ink-700">
          We could not reach the sign-in provider to list the organizations you belong to, so nothing is shown rather than a partial list. Reload in a minute. Your books and their data are untouched.
        </p>
      </AppShell>
    );
  }
  const books = rankBooks(loaded);
  const totals = totalBooks(books);
  const needAttention = books.filter((b) => b.attention.length > 0).length;

  return (
    <AppShell
      title="Client books"
      subtitle={`${books.length} ${books.length === 1 ? 'book' : 'books'}${needAttention ? `, ${needAttention} need${needAttention === 1 ? 's' : ''} a look` : ', all in order'}`}
    >
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <div className="card-primary"><p className="text-sm text-ink-600">Outstanding</p><div className="mt-1 text-xl font-semibold"><MoneyLines money={totals.money} field="outstanding" /></div></div>
        <div className="card-primary"><p className="text-sm text-ink-600">Overdue</p><div className="mt-1 text-xl font-semibold"><MoneyLines money={totals.money} field="overdue" /></div></div>
        <div className="card-primary"><p className="text-sm text-ink-600">Waiting for approval</p><p className="mt-1 text-xl font-semibold">{totals.awaitingApproval}</p></div>
        <div className="card-primary"><p className="text-sm text-ink-600">Replies to read</p><p className="mt-1 text-xl font-semibold">{totals.newReplies}</p></div>
      </div>

      <div className="card-primary overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Every client book you belong to, books that need attention first</caption>
          <thead>
            <tr className="text-left text-ink-600">
              <th scope="col" className="py-2 pr-4 font-medium">Book</th>
              <th scope="col" className="py-2 pr-4 font-medium">Outstanding</th>
              <th scope="col" className="py-2 pr-4 font-medium">Overdue</th>
              <th scope="col" className="py-2 pr-4 font-medium">Oldest</th>
              <th scope="col" className="py-2 pr-4 font-medium">Needs you</th>
              <th scope="col" className="py-2 text-right font-medium"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {books.map((b) => (
              <tr key={b.orgId} className="border-t border-ink-200/70 align-top">
                <th scope="row" className="py-3 pr-4 text-left font-medium">
                  {b.name}
                  {b.orgId === orgId && <span className="badge ml-2">Current</span>}
                  <div className="text-xs font-normal text-ink-500">{b.openInvoices} open, {b.overdueInvoices} overdue</div>
                </th>
                <td className="py-3 pr-4"><MoneyLines money={b.money} field="outstanding" /></td>
                <td className="py-3 pr-4"><MoneyLines money={b.money} field="overdue" /></td>
                <td className="py-3 pr-4">{b.oldestOverdueDays > 0 ? `${b.oldestOverdueDays}d late` : <span className="text-ink-500">None</span>}</td>
                <td className="py-3 pr-4">
                  {b.attention.length === 0
                    ? <span className="text-ink-500">Nothing</span>
                    : <ul className="space-y-0.5">{b.attention.map((a) => <li key={a}>{a}</li>)}</ul>}
                </td>
                <td className="py-3 text-right">{b.orgId === orgId ? null : <OpenBookButton orgId={b.orgId} label={b.name} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {books.length === 0 && <p className="py-6 text-ink-600">No books yet.</p>}
      </div>

      <p className="mt-4 text-sm text-ink-600">
        Only organizations you belong to are listed. To add a client, create an organization from the switcher on the left and connect their Xero or QuickBooks.
      </p>
      <p className="mt-2 text-sm text-ink-600">{practiceBillingNote(books.length, PRACTICE_INCLUDED_ORGS, PRACTICE_EXTRA_ORG_MONTHLY)}</p>
    </AppShell>
  );
}
