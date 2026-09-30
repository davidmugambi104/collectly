export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { AppShell } from '@/components/app/shell';
import { StatementActions } from '@/components/customers/statement-actions';
import { getAuthWithOrg as auth } from '@/lib/auth-helper';
import { db } from '@/db';
import { customers, statementLog } from '@/db/schema';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { loadStatement } from '@/lib/statements-load';
import { BUCKET_LABELS, describeStatement, formatMoney, formatStatementDate } from '@/lib/statements';
import { AGED_BUCKETS } from '@/lib/aged-receivables';
import { statementTarget } from '@/lib/statement-target';

export default async function CustomerStatementScreen({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.userId || !session.orgId) redirect('/sign-in');
  const orgId = session.orgId;
  const { id } = await params;

  const [customer] = await db.select({ id: customers.id, name: customers.name, email: customers.email, dndAt: customers.dndAt }).from(customers).where(and(eq(customers.id, id), eq(customers.orgId, orgId))).limit(1);
  if (!customer) notFound();

  await ensureDunningControlSchema();
  const statement = await loadStatement(orgId, id);
  const sent = await db.select().from(statementLog).where(and(eq(statementLog.orgId, orgId), eq(statementLog.customerId, id))).orderBy(desc(statementLog.sentAt)).limit(10);
  const target = statementTarget({ email: customer.email, unsubscribedAt: customer.dndAt });
  const nothingOwed = statement.sections.length === 0;

  return (
    <AppShell title={`Statement for ${customer.name}`} subtitle={nothingOwed ? `Nothing owed as of ${formatStatementDate(statement.asOf)}` : `${describeStatement(statement)}, as of ${formatStatementDate(statement.asOf)}`}>
      <p className="mb-4 text-sm print:hidden"><Link href={`/dashboard/customers/${customer.id}`} className="link">Back to {customer.name}</Link></p>

      {nothingOwed ? (
        <p className="rounded-[10px] border border-dashed border-ink-300/70 px-4 py-8 text-center app-meta">This customer has no open invoices with a balance.</p>
      ) : statement.sections.map((sec) => (
        <section key={sec.currency} className="card mb-4" aria-label={`Invoices in ${sec.currency}`}>
          <h2 className="app-heading">Invoices in {sec.currency}</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left app-meta">
                  <th className="py-1.5 pr-3 font-medium">Invoice</th><th className="py-1.5 pr-3 font-medium">Issued</th><th className="py-1.5 pr-3 font-medium">Due</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Amount</th><th className="py-1.5 pr-3 text-right font-medium">Paid</th><th className="py-1.5 pr-3 text-right font-medium">Balance</th><th className="py-1.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sec.rows.map((r) => (
                  <tr key={r.number + r.due.toISOString()} className="border-t [border-color:var(--hair)]">
                    <td className="py-1.5 pr-3 font-mono">{r.number}{r.disputed && <span className="badge-warn ml-2">In dispute</span>}</td>
                    <td className="py-1.5 pr-3">{formatStatementDate(r.issued)}</td>
                    <td className="py-1.5 pr-3">{formatStatementDate(r.due)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{formatMoney(r.amountCents, sec.currency)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{formatMoney(r.paidCents, sec.currency)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums font-semibold">{formatMoney(r.balanceCents, sec.currency)}</td>
                    <td className="py-1.5 text-right">{r.daysOverdue > 0 ? `${r.daysOverdue} days late` : 'Not yet due'}</td>
                  </tr>
                ))}
                <tr className="border-t-2 [border-color:var(--hair)] font-semibold">
                  <td className="py-2 pr-3" colSpan={5}>Total owed</td><td className="py-2 pr-3 text-right tabular-nums">{formatMoney(sec.totalCents, sec.currency)}</td><td />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="app-meta mt-2 font-normal">{AGED_BUCKETS.map((b, i) => sec.bucketsCents[i] > 0 ? `${BUCKET_LABELS[b]}: ${formatMoney(sec.bucketsCents[i], sec.currency)}` : null).filter(Boolean).join(' · ')}</p>
        </section>
      ))}

      <StatementActions
        customerId={customer.id}
        customerName={customer.name}
        email={target.ok ? target.to : null}
        blockedReason={target.ok ? (nothingOwed ? 'There is nothing to send: this customer owes nothing.' : null) : target.reason}
      />

      <section className="mt-6 print:hidden" aria-labelledby="sent-heading">
        <h2 id="sent-heading" className="app-heading">Statements sent</h2>
        {sent.length === 0 ? <p className="app-meta mt-1 font-normal">None yet. Statements are only sent when you send one here; nothing is scheduled.</p> : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {sent.map((s: (typeof sent)[number]) => (
              <li key={s.id}>{formatStatementDate(s.sentAt)} · {s.totals.map((t: { currency: string; totalCents: number }) => `${formatMoney(t.totalCents, t.currency)} owed`).join(', ')}</li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
