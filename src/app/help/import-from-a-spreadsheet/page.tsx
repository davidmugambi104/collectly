import { pageMetadata } from '@/lib/seo';
import { HelpArticle, H2, P } from '../_lib/article';

export const metadata = pageMetadata({
  title: 'Import from a spreadsheet (CSV), in detail',
  description: 'The exact columns Mugavi needs, size and row limits, what happens on a second upload, and how errors are shown.',
  path: '/help/import-from-a-spreadsheet',
  keywords: ['CSV invoice import', 'spreadsheet import Mugavi', 'import invoices from Excel'],
});

export default function Page() {
  return (
    <HelpArticle
      title="Import from a spreadsheet (CSV), in detail"
      lead="Works with an export from any accounting tool: QuickBooks, Xero, FreshBooks, Zoho Books, Sage, Wave, or a plain Excel file saved as CSV. No keys or sign-in needed."
    >
      <H2>What it needs</H2>
      <P>Required: invoice number, customer name, amount, and dates. Optional: balance, currency, status, and customer email. Up to 5 MB and 5,000 rows in one file.</P>

      <H2>Steps</H2>
      <ol className="mt-4 list-decimal pl-5 space-y-2 text-ink-700">
        <li>Open Dashboard, then Integrations, then <b>Import a CSV</b>.</li>
        <li>Press <b>Choose a CSV file</b>. Mugavi guesses which column is which and which date format you used; fix any column with the dropdowns if it guessed wrong.</li>
        <li>Check the preview: how many rows are ready, how many have a problem and will be skipped, and how many are already paid, void or draft and so are not added.</li>
        <li>Press <b>Import [n] rows</b>.</li>
      </ol>

      <H2>Uploading again</H2>
      <P>Re-upload the same or an updated file any time. Importing the same invoice number again updates that invoice; it does not create a duplicate. CSV import does not sync on its own, unlike QuickBooks or Xero: you re-upload by hand whenever you want it refreshed.</P>

      <H2>Taking it back out</H2>
      <P>To remove CSV-imported data, use the remove option on the Integrations page, the same as for a disconnected QuickBooks or Xero. Anything you typed in directly in Mugavi, or that came from another provider, is left alone.</P>
    </HelpArticle>
  );
}
