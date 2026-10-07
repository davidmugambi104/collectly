import { pageMetadata } from '@/lib/seo';
import { HelpArticle, H2, P } from '../_lib/article';

export const metadata = pageMetadata({
  title: 'Set up late fees',
  description: 'Set a late fee rule, review proposed fees, and apply or waive them. Nothing is ever charged automatically.',
  path: '/help/late-fees',
  keywords: ['late fee invoice software', 'late fee rule Mugavi', 'waive late fee'],
});

export default function Page() {
  return (
    <HelpArticle
      title="Set up late fees"
      lead="Mugavi works out and keeps track of late fees. It never adds one on its own: you review each one and press Apply."
    >
      <H2>1. Set a rule</H2>
      <P>Open Dashboard, then Late fees. Choose a flat amount or a percentage of the unpaid balance, a grace period before it applies, whether it repeats every 30 days while the invoice stays unpaid, and an optional cap.</P>

      <H2>2. Review and apply</H2>
      <P>Mugavi lists which open invoices are now due a fee under your rule. Tick the ones you want, or <b>Select all</b>, then press <b>Apply selected</b> and confirm with <b>Yes, apply</b>. You can instead press <b>Do not charge selected</b> and <b>Yes, set aside</b>; those invoices will not be proposed again.</P>
      <P>Disputed invoices, and invoices with an open promise to pay, are never proposed.</P>

      <H2>Waive or mark paid</H2>
      <P>On an already-applied fee, press <b>Waive</b> to stop it being owed, or <b>Mark paid</b> once the customer has paid it.</P>

      <H2>What a fee does not do</H2>
      <ul className="mt-4 list-disc pl-5 space-y-2 text-ink-700">
        <li>It never changes the invoice amount in QuickBooks or Xero, and is not written back there.</li>
        <li>It is not added to the payment page; the customer cannot pay it there, you mark it paid yourself.</li>
        <li>It does not appear in the aged receivables report.</li>
        <li>A flat fee applies only in one currency.</li>
      </ul>
      <P>A fee shows as its own line under the unchanged invoice, on reminders and statements. Mugavi does not give legal advice; check your contract and local law before turning this on.</P>
    </HelpArticle>
  );
}
