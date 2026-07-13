import { db, schema } from '@/db';
import { invoices, customers, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { formatCurrency, formatDate, daysOverdue } from '@/lib/utils';
import { PaymentForm } from '@/components/payment/payment-form';
import { Logo } from '@/components/brand/logo';
import { ShieldCheck, Clock, Mail, ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PaymentPortal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [row] = await db
    .select({ invoice: invoices, customer: customers, org: organizations })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(organizations, eq(organizations.id, invoices.orgId))
    .where(eq(invoices.id, id))
    .limit(1);

  if (!row) notFound();

  const { invoice, customer, org } = row;
  const balance = Number(invoice.amount) - Number(invoice.amountPaid);
  const days = daysOverdue(invoice.dueDate);
  const isOverdue = days > 0;

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="container-tight py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo className="h-6 w-6" />
            <div>
              <div className="text-sm font-semibold text-ink-900">{org.name}</div>
              <div className="text-xs text-ink-500">Secure payment</div>
            </div>
          </div>
          <div className="text-xs text-ink-500 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Encrypted by Collectly</div>
        </div>
      </header>

      <div className="container-tight py-10 grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3">
          <div className="card-lg">
            <h1 className="h3">Pay invoice #{invoice.number}</h1>
            <p className="mt-1 text-sm text-ink-600">Amount due: <span className="font-display font-semibold text-ink-950">{formatCurrency(balance, invoice.currency)}</span></p>
            {isOverdue && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>This invoice is <b>{days} day{days === 1 ? '' : 's'}</b> past due. Settling now will close the account.</div>
              </div>
            )}
            <div className="mt-6">
              <PaymentForm amount={balance} currency={invoice.currency} invoiceNumber={invoice.number} />
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="card">
            <h2 className="font-semibold text-ink-900">Invoice</h2>
            <dl className="mt-3 text-sm divide-y divide-ink-100">
              <div className="flex justify-between py-1.5"><dt className="text-ink-500">Number</dt><dd className="font-mono">{invoice.number}</dd></div>
              <div className="flex justify-between py-1.5"><dt className="text-ink-500">Issued</dt><dd>{formatDate(invoice.issueDate)}</dd></div>
              <div className="flex justify-between py-1.5"><dt className="text-ink-500">Due</dt><dd>{formatDate(invoice.dueDate)}</dd></div>
              <div className="flex justify-between py-1.5"><dt className="text-ink-500">Amount</dt><dd className="font-mono">{formatCurrency(invoice.amount, invoice.currency)}</dd></div>
              {Number(invoice.amountPaid) > 0 && <div className="flex justify-between py-1.5"><dt className="text-ink-500">Paid</dt><dd className="font-mono text-emerald-600">−{formatCurrency(invoice.amountPaid, invoice.currency)}</dd></div>}
              <div className="flex justify-between py-1.5"><dt className="text-ink-500 font-semibold">Balance</dt><dd className="font-mono font-semibold">{formatCurrency(balance, invoice.currency)}</dd></div>
            </dl>
            {invoice.description && <p className="mt-3 text-sm text-ink-600">{invoice.description}</p>}
          </div>

          <div className="card">
            <h2 className="font-semibold text-ink-900">Questions?</h2>
            <p className="mt-1 text-sm text-ink-600">Reply to the email this link came from, or contact <a href={`mailto:${org.slug}@collectly.app`} className="link">{org.slug}@collectly.app</a>.</p>
          </div>

          <div className="card bg-ink-50/50">
            <h3 className="font-semibold text-ink-900 text-sm">Powered by Collectly</h3>
            <p className="mt-1 text-xs text-ink-600">AI-native accounts-receivable for small businesses.</p>
            <a href="https://collectly.app" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 font-medium">Learn more <ExternalLink className="h-3 w-3" /></a>
          </div>
        </div>
      </div>
    </div>
  );
}
