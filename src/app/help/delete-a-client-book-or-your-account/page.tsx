import { pageMetadata } from '@/lib/seo';
import { HelpArticle, H2, P } from '../_lib/article';

export const metadata = pageMetadata({
  title: 'Delete a client book or your account',
  description: 'What deleting a Mugavi workspace wipes right away, what to download first, and that it does not cancel billing by itself.',
  path: '/help/delete-a-client-book-or-your-account',
  keywords: ['delete Mugavi account', 'delete client book Mugavi'],
});

export default function Page() {
  return (
    <HelpArticle
      title="Delete a client book or your account"
      lead="In Mugavi, a client book is its own workspace. Deleting it from Settings permanently removes that one workspace. This cannot be undone."
    >
      <H2>What gets wiped right away</H2>
      <P>Customers, invoices, payments, dunning history, and integrations for that workspace. It also revokes Mugavi&apos;s access at QuickBooks, Xero and Square for that workspace.</P>

      <H2>Download first</H2>
      <P>Before you delete, download your reminder history and aged receivables report as CSV, or everything at once; see export your data. Deleting does not by itself stop billing: if you are on a paid plan, ask to cancel on Billing as well.</P>

      <H2>How to delete</H2>
      <ol className="mt-4 list-decimal pl-5 space-y-2 text-ink-700">
        <li>Open Dashboard, then Settings, and find <b>Delete account</b> in the danger zone.</li>
        <li>Press <b>Delete account</b>. A dialog opens.</li>
        <li>Type the workspace name exactly to confirm; the button will not turn on until it matches.</li>
        <li>Press <b>Delete forever</b>.</li>
      </ol>
      <P>You are then signed out and returned to sign-in. Our privacy notice covers how long backups of deleted data persist.</P>

      <H2>More than one client book</H2>
      <P>Deleting one workspace does not touch any other workspace you belong to. Use the organisation switcher in the left sidebar, or Client books, to make sure you are in the one you mean to delete before you start.</P>
    </HelpArticle>
  );
}
