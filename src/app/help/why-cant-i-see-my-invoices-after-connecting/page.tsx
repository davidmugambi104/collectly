import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';
import { HelpArticle, H2, P } from '../_lib/article';

export const metadata = pageMetadata({
  title: "Why can't I see my invoices after connecting",
  description: 'The four usual reasons a connected QuickBooks or Xero shows no invoices, and how to check each one.',
  path: '/help/why-cant-i-see-my-invoices-after-connecting',
  keywords: ['QuickBooks invoices not showing', 'Xero invoices not showing Mugavi', 'no invoices after sync'],
});

export default function Page() {
  return (
    <HelpArticle
      title="Why can't I see my invoices after connecting"
      lead="You connected QuickBooks or Xero, but Invoices or Customers is empty, or missing invoices you know exist. It is almost always one of these four."
    >
      <H2>1. You are looking at the wrong workspace</H2>
      <P>Each QuickBooks or Xero connection belongs to one Mugavi organization. If you or a teammate is signed in to a different workspace, that workspace has its own, separate data and will not show this connection&apos;s invoices. Check the organization switcher, or open <Link href="/dashboard/practice" className="underline">Client books</Link> to see every workspace you belong to.</P>

      <H2>2. The sync has not run yet</H2>
      <P>Connecting authorizes Mugavi; it does not pull your data by itself. Open Dashboard, then Integrations, and press <b>Sync now</b> on the QuickBooks or Xero card. Keep the page open until it reports a count, for example &quot;Imported 29 customers, 20 invoices&quot;. If it reports 0 of something you expect, re-check the connected company or organization.</P>

      <H2>3. Only open invoices come in</H2>
      <P>The sync brings in invoices with a balance still owed. An invoice already paid, voided, or marked as a draft in QuickBooks or Xero is not imported as something to chase, so a fully paid invoice you are looking for in your books will not appear in Mugavi&apos;s Invoices list.</P>

      <H2>4. QuickBooks: a sandbox company, not your real one</H2>
      <P>The QuickBooks connection is beta. If you authorized against an Intuit sandbox (test) company rather than your real QuickBooks Online company, the sync works, but it only ever shows that sandbox&apos;s test data, never your real invoices. Disconnect and reconnect, picking your real company when Intuit asks. This does not apply to Xero.</P>

      <H2>Still nothing?</H2>
      <P>Check the card on Integrations for a lastSyncAt time and any error text in the sync result message, then see <Link className="underline" href="/help/connection-shows-an-error-or-reconnect">your connection shows an error, or you need to reconnect</Link>.</P>
    </HelpArticle>
  );
}
