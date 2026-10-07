import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { pageMetadata } from '@/lib/seo';
import { CONTACT } from '@/lib/site-contact';

export const metadata = pageMetadata({
  title: 'Connect QuickBooks or Xero, or import a spreadsheet',
  description:
    'How to connect QuickBooks Online or Xero to Mugavi, what Mugavi reads and writes, how to disconnect, and how to import a CSV instead.',
  path: '/help/connect-quickbooks-or-xero',
  keywords: ['connect QuickBooks to Mugavi', 'connect Xero to Mugavi', 'import invoices CSV'],
});

export default function Page() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <article className="container-page pt-16 pb-20 max-w-3xl">
        <p className="eyebrow">Help</p>
        <h1 className="mt-3 h1">Connect QuickBooks or Xero, or import a spreadsheet</h1>
        <p className="mt-6 lead">
          You need customers and invoices in Mugavi before it can draft a single reminder. There are three ways in:
          connect QuickBooks Online, connect Xero, or import a CSV export from any accounting tool. You can use more
          than one at a time.
        </p>

        <h2 className="mt-12 h2">Connect QuickBooks Online</h2>
        <ol className="mt-4 list-decimal pl-5 space-y-2 text-ink-700">
          <li>Open Dashboard, then Integrations.</li>
          <li>On the QuickBooks card, press <b>Connect to QuickBooks</b>.</li>
          <li>Sign in to Intuit and authorize Mugavi. Mugavi asks for the accounting permission only.</li>
          <li>You land back on Integrations with a green banner: QuickBooks connected. Press <b>Sync now</b>.</li>
        </ol>
        <p className="mt-4 text-ink-700">
          Mugavi reads customers, open invoices, credit memos with a remaining balance, and payments with an unapplied
          amount. The only thing it writes back is a payment record, and only when a customer pays an invoice through
          Mugavi. It does not create or edit customers or invoices in QuickBooks. QuickBooks Desktop is not supported,
          only QuickBooks Online.
        </p>
        <p className="mt-4 text-ink-700">
          <b>The QuickBooks connection is in beta.</b> If Mugavi connects you to a sandbox or test company rather than
          your real QuickBooks company, that connection is for testing only and will not show your real invoices. See
          <Link href="/help/why-cant-i-see-my-invoices-after-connecting" className="underline"> why you might not see your invoices</Link> if that happens.
        </p>

        <h2 className="mt-12 h2">Connect Xero</h2>
        <ol className="mt-4 list-decimal pl-5 space-y-2 text-ink-700">
          <li>Open Dashboard, then Integrations.</li>
          <li>On the Xero card, press <b>Connect to Xero</b>.</li>
          <li>Sign in to Xero, pick the organisation to connect, and authorize Mugavi.</li>
          <li>Back on Integrations the card shows which Xero organisation it connected to. Press <b>Sync now</b>.</li>
        </ol>
        <p className="mt-4 text-ink-700">
          Mugavi reads customers, invoices and credit notes from that one Xero organisation. If your Xero account has
          more than one organisation, make sure you picked the right one when you authorized; Mugavi only ever syncs
          the organisation you connected.
        </p>

        <h2 className="mt-12 h2">An integration belongs to one workspace</h2>
        <p className="mt-4 text-ink-700">
          Each QuickBooks or Xero connection is tied to the Mugavi workspace (client book) it was connected from. If you
          or a teammate is in a different workspace, you will not see that connection or its invoices there. Use the
          organisation switcher in the left sidebar to move to the right workspace, or check <Link href="/dashboard/practice" className="underline">Client books</Link> for the full list you belong to.
        </p>

        <h2 className="mt-12 h2">Import a spreadsheet (CSV) instead</h2>
        <p className="mt-4 text-ink-700">
          If you do not use QuickBooks or Xero, or just want to get started faster, open Dashboard, then Integrations,
          then press <b>Import a CSV</b> on the spreadsheet card. It works with an export from any accounting tool and
          needs no keys or login. Re-upload the same file later to refresh it; it does not sync on its own the way
          QuickBooks and Xero do.
        </p>

        <h2 className="mt-12 h2">Sync now</h2>
        <p className="mt-4 text-ink-700">
          QuickBooks and Xero are not a live mirror of your books. Mugavi pulls data only when you press <b>Sync now</b>
          on the Integrations page. Run it again any time your books change and you want Mugavi caught up.
        </p>

        <h2 className="mt-12 h2">Disconnect</h2>
        <p className="mt-4 text-ink-700">
          Press <b>Disconnect from QuickBooks</b> or <b>Disconnect from Xero</b> on the Integrations page and confirm.
          Mugavi asks the provider to revoke its access and deletes the stored tokens. If the provider does not confirm
          that it removed the access, Mugavi tells you so, and asks you to finish the job yourself: open Connected apps
          in Xero, or your apps list in Intuit's account, and remove Mugavi there (it may be listed under an older app
          name).
        </p>
        <p className="mt-4 text-ink-700">
          Customers and invoices already imported stay in Mugavi after you disconnect, until you remove them yourself
          or delete your account. If Integrations shows a notice that a disconnected provider left data behind, press
          <b> Review and remove</b> to see the count, then confirm. Only the rows that came from that provider go.
          Anything you typed in by hand, or that came from another provider, stays. This cannot be undone.
        </p>

        <p className="mt-12 text-sm text-ink-600">
          Stuck? Write to <a className="underline" href={`mailto:${CONTACT.hello}`}>{CONTACT.hello}</a>. Replies within one business day.
        </p>
      </article>
      <MarketingFooter />
    </div>
  );
}
