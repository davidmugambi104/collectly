import { pageMetadata } from '@/lib/seo';
import { HelpArticle, H2, P } from '../_lib/article';

export const metadata = pageMetadata({
  title: 'Export your data',
  description: 'Download everything as a ZIP of CSV files, or one CSV at a time: customers, invoices, reminders and statements.',
  path: '/help/export-your-data',
  keywords: ['export Mugavi data', 'download invoices CSV', 'data export ZIP'],
});

export default function Page() {
  return (
    <HelpArticle
      title="Export your data"
      lead="One download on the Settings page: a ZIP of CSV files covering customers, invoices, reminders, what each customer owes, and statements emailed. Each file also works on its own as a single CSV."
    >
      <H2>Who can export</H2>
      <P>Only the workspace owner or an org admin. Everyone else does not see the option.</P>

      <H2>What is in it</H2>
      <ul className="mt-4 list-disc pl-5 space-y-2 text-ink-700">
        <li>Customers, invoices, reminder history, an aged-receivables style summary of what each customer owes, and the statement log.</li>
        <li>Each one is also downloadable as a single CSV from where it lives in the app, for example reminder history or the aged receivables report.</li>
      </ul>
      <P>The payments table itself is not exported as its own file; invoice paid amounts are included on the invoices file.</P>

      <H2>Limits</H2>
      <ul className="mt-4 list-disc pl-5 space-y-2 text-ink-700">
        <li>Up to 50,000 rows per file.</li>
        <li>Up to 10 exports an hour, after which you are asked to wait.</li>
      </ul>

      <H2>Before you disconnect or delete</H2>
      <P>Export is the right first step before removing imported QuickBooks or Xero data, or before deleting your account: once either is done, there is nothing left to download.</P>
    </HelpArticle>
  );
}
