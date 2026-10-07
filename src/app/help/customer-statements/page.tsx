import { pageMetadata } from '@/lib/seo';
import { HelpArticle, H2, P } from '../_lib/article';

export const metadata = pageMetadata({
  title: 'Send a customer statement',
  description: 'Print, download as CSV, or email a statement of everything a customer owes, with a 30-second undo.',
  path: '/help/customer-statements',
  keywords: ['customer statement Mugavi', 'aged statement invoice', 'email statement undo'],
});

export default function Page() {
  return (
    <HelpArticle
      title="Send a customer statement"
      lead="A statement lists every open invoice for one customer: what is paid, what is left, how late, and a total. It is built fresh each time, never on a schedule."
    >
      <H2>Where to find it</H2>
      <P>Open Dashboard, then Customers, then that customer, then Statement.</P>

      <H2>Three ways to get it out</H2>
      <ul className="mt-4 list-disc pl-5 space-y-2 text-ink-700">
        <li><b>Print</b>: opens your browser&apos;s print dialog.</li>
        <li><b>Download CSV</b>: the same numbers as a spreadsheet file.</li>
        <li><b>Email to [address]</b>: add an optional line above the statement, then press it. A 30-second countdown starts; press <b>Undo</b> or close the page before it ends and nothing sends.</li>
      </ul>
      <P>A reply to a statement email comes to your Inbox, same as a reminder reply.</P>

      <H2>Who gets left out</H2>
      <P>You cannot email a statement to a customer with no email on file, who has unsubscribed, or who owes nothing right now. The Email button is replaced with the reason when one of these applies.</P>

      <H2>What it does not do yet</H2>
      <P>There are no scheduled or monthly statements and no bulk send: each one is a single, manual action for one customer. Amounts shown are the invoice balances Mugavi holds; payments and credit notes are not shown as separate lines.</P>
    </HelpArticle>
  );
}
