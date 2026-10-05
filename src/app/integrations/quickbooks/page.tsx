import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { pageMetadata } from '@/lib/seo';
import { CONTACT } from '@/lib/site-contact';
import { TRADEMARK_NOTICE } from '@/lib/trademark';

export const dynamic = 'force-static';

export const metadata = pageMetadata({
  title: 'Mugavi for QuickBooks Online: overdue invoice reminders',
  description:
    'Mugavi reads your QuickBooks Online invoices and drafts payment reminders for you to approve. What it reads, the one thing it writes, and how to disconnect.',
  path: '/integrations/quickbooks',
  keywords: ['QuickBooks Online invoice reminders', 'QuickBooks overdue invoices'],
});

/**
 * Intuit's "Learn more" URL. Names QuickBooks only, so it uses its own plain
 * header and footer instead of the site-wide ones.
 */
export default function QuickBooksIntegrationPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="container-tight py-16 prose prose-ink max-w-none">
        <Link href="/" className="not-prose inline-flex items-center gap-2.5 font-display font-bold text-ink-950">
          <Logo className="h-7 w-7" />
          <span>Mugavi</span>
        </Link>
        <h1 className="mt-8 text-4xl font-display font-bold">Mugavi for QuickBooks Online</h1>
        <p className="lead">
          Mugavi drafts polite reminders for your overdue QuickBooks invoices. You approve each one before anything is sent.
        </p>

        <h2 className="font-display font-semibold text-xl mt-8">How it works</h2>
        <ol>
          <li>Connect your QuickBooks Online company once.</li>
          <li>Mugavi reads your overdue invoices and drafts a reminder for each.</li>
          <li>Each draft waits in an approval queue. You edit, skip or approve it.</li>
        </ol>
        <p>The trial is 14 days with no card taken. See <Link href="/pricing">pricing</Link> for the plans after that.</p>

        <h2 className="font-display font-semibold text-xl mt-8">What Mugavi reads</h2>
        <ul>
          <li>Customers</li>
          <li>Open invoices</li>
          <li>Credit memos that still have a balance</li>
          <li>Payments that have an unapplied amount</li>
        </ul>
        <p>Mugavi asks for the QuickBooks accounting permission only.</p>

        <h2 className="font-display font-semibold text-xl mt-8">The one thing it writes</h2>
        <p>
          When a customer pays an invoice through Mugavi, Mugavi records that payment against the invoice in QuickBooks.
          That is the only write. It does not create or edit customers or invoices.
        </p>

        <h2 className="font-display font-semibold text-xl mt-8">Disconnect any time</h2>
        <p>
          In Mugavi, open Integrations and choose <b>Disconnect from QuickBooks</b>. Mugavi asks QuickBooks to revoke its
          access, deletes the connection tokens it holds and stops syncing. You can also remove the app from your
          QuickBooks account. Customers and invoices already imported stay in Mugavi until you remove them or delete your
          account. The <Link href="/privacy">privacy policy</Link> has the detail.
        </p>

        <h2 className="font-display font-semibold text-xl mt-8">Limits</h2>
        <ul>
          <li>QuickBooks Online only. Mugavi does not connect to QuickBooks Desktop.</li>
          <li>Data is pulled when you press Sync now. It is not a live mirror of your books.</li>
          <li>Available to businesses in the US and UK.</li>
        </ul>

        <p className="mt-8">
          <Link href="/sign-in">Sign in</Link> or <Link href="/sign-up">start a trial</Link>. Questions: <a href={`mailto:${CONTACT.hello}`}>{CONTACT.hello}</a>
        </p>
        <p className="text-sm text-ink-500">{TRADEMARK_NOTICE}</p>
      </div>
    </div>
  );
}
