import { db, schema } from '@/db';
import { invoices, customers, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { formatCurrency, formatDate, daysOverdue } from '@/lib/utils';
import { PaymentForm } from '@/components/payment/payment-form';
import { Logo } from '@/components/brand/logo';
import { ShieldCheck, Clock, Mail, ExternalLink, CheckCircle2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getConnectedStripeAccountId } from '@/lib/integrations/stripe-connect';

export const dynamic = 'force-dynamic';

export default async function PaymentPortal({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string; session_id?: string; cancelled?: string }> }) {
  const { id } = await params;
  const { paid, cancelled, session_id } = await searchParams;

  const [row] = await db
    .select({ invoice: invoices, customer: customers, org: organizations })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(organizations, eq(organizations.id, invoices.orgId))
    .where(eq(invoices.id, id))
    .limit(1);

  if (!row) notFound();

  const { invoice, customer, org } = row;
  // Card/ACH only get offered once this business has connected their own
  // Stripe account — /api/payment/create-checkout charges the connected
  // account directly, deliberately with no fallback to Collectly's own
  // platform account, so the option shouldn't be shown as if it works
  // when it can't yet.
  const cardAchAvailable = !!(await getConnectedStripeAccountId(org.id));
  const balance = Number(invoice.amount) - Number(invoice.amountPaid);
  const days = daysOverdue(invoice.dueDate);
  const isOverdue = days > 0;
  // `paid=1` only means "the payment provider redirected back here" — it
  // does NOT mean the webhook that actually updates the invoice has run
  // yet (real race: the browser redirect can and does arrive before an
  // async webhook), and for Paystack specifically a charge could
  // legitimately be for less than the full balance. Was shown
  // unconditionally on `paid` alone, so a customer could see a full
  // "Payment received" confirmation while the invoice — and the balance
  // sidebar right next to it, which reads the same real DB row — still
  // showed money owed, or while the payment never actually got recorded
  // at all if the webhook failed.
  const genuinelyPaid = paid === '1' && invoice.status === 'paid';
  const paidButUnconfirmed = paid === '1' && invoice.status !== 'paid';

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
            {genuinelyPaid ? (
              <div className="text-center py-6">
                <div className="h-14 w-14 mx-auto rounded-full bg-emerald-50 grid place-items-center">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <h1 className="mt-4 h3">Payment received</h1>
                <p className="mt-2 text-sm text-ink-600">Thank you. We received your payment for invoice <b>#{invoice.number}</b>.</p>
                <p className="mt-1 text-sm text-ink-600">A receipt has been emailed to <span className="font-mono">{customer.email ?? 'your address'}</span>.</p>
                {session_id && <p className="mt-1 text-xs text-ink-500 font-mono">Stripe session: {session_id.substring(0, 18)}…</p>}
                <p className="mt-4 text-xs text-ink-500">If you have any questions, reply to the receipt email or contact <a className="link" href={`mailto:${org.slug}@getcollectly.app`}>{org.slug}@getcollectly.app</a>.</p>
              </div>
            ) : paidButUnconfirmed ? (
              <div className="text-center py-6">
                <div className="h-14 w-14 mx-auto rounded-full bg-amber-50 grid place-items-center">
                  <Clock className="h-7 w-7 text-amber-600" />
                </div>
                <h1 className="mt-4 h3">Confirming your payment…</h1>
                <p className="mt-2 text-sm text-ink-600">
                  We got the redirect back from checkout, but it hasn&apos;t finished processing yet — this is usually a
                  few seconds. {balance > 0 ? `Remaining balance shown is $${balance.toFixed(2)} until it clears.` : ''}
                </p>
                <p className="mt-1 text-sm text-ink-600">Refresh this page in a moment, or check back — a receipt will be emailed once it&apos;s confirmed.</p>
                <p className="mt-4 text-xs text-ink-500">If this doesn&apos;t update within a few minutes, contact <a className="link" href={`mailto:${org.slug}@getcollectly.app`}>{org.slug}@getcollectly.app</a> and we&apos;ll sort it out.</p>
              </div>
            ) : cancelled ? (
              <div>
                <h1 className="h3">Payment cancelled</h1>
                <p className="mt-2 text-sm text-ink-600">No charge was made. You can try again below or contact {org.name} with any questions.</p>
                <div className="mt-6">
                  <PaymentForm amount={balance} currency={invoice.currency} invoiceNumber={invoice.number} invoiceId={invoice.id} orgSlug={org.slug} customerEmail={customer.email} cardAchAvailable={cardAchAvailable} />
                </div>
              </div>
            ) : (
              <>
                <h1 className="h3">Pay invoice #{invoice.number}</h1>
                <p className="mt-1 text-sm text-ink-600">Amount due: <span className="font-display font-semibold text-ink-950">{formatCurrency(balance, invoice.currency)}</span></p>
                {isOverdue && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>This invoice is <b>{days} day{days === 1 ? '' : 's'}</b> past due. Settling now will close the account.</div>
                  </div>
                )}
                <div className="mt-6">
                  <PaymentForm amount={balance} currency={invoice.currency} invoiceNumber={invoice.number} invoiceId={invoice.id} orgSlug={org.slug} customerEmail={customer.email} cardAchAvailable={cardAchAvailable} />
                </div>
              </>
            )}
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
            <p className="mt-1 text-sm text-ink-600">Reply to the email this link came from, or contact <a href={`mailto:${org.slug}@getcollectly.app`} className="link">{org.slug}@getcollectly.app</a>.</p>
          </div>

          <div className="card bg-ink-50/50">
            <h3 className="font-semibold text-ink-900 text-sm">Powered by Collectly</h3>
            <p className="mt-1 text-xs text-ink-600">AI-native accounts-receivable for small businesses.</p>
            <a href="https://getcollectly.app" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 font-medium">Learn more <ExternalLink className="h-3 w-3" /></a>
          </div>
        </div>
      </div>
    </div>
  );
}
