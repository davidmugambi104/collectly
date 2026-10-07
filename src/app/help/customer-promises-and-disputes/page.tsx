import { pageMetadata } from '@/lib/seo';
import { HelpArticle, H2, P } from '../_lib/article';

export const metadata = pageMetadata({
  title: 'When a customer says "I will pay" or "something is wrong"',
  description: 'What the two self-service buttons on the payment page do, and where you see the answer as the owner.',
  path: '/help/customer-promises-and-disputes',
  keywords: ['promise to pay', 'invoice dispute Mugavi', 'customer payment page buttons'],
});

export default function Page() {
  return (
    <HelpArticle
      title='When a customer says "I will pay" or "something is wrong"'
      lead="On the payment page, under the invoice, a customer can answer without writing an email. Both actions pause reminders and tell you."
    >
      <H2>&quot;Tell us the day I will pay&quot;</H2>
      <P>The customer picks a date up to 30 days out and presses <b>Tell [your business name]</b>. Reminders for that invoice stop until the end of that day. You see the promise on the invoice and in the explainer; nothing further happens automatically, the reminder schedule simply resumes if the date passes unpaid.</P>

      <H2>&quot;Something about this invoice is not right&quot;</H2>
      <P>The customer picks a reason (already paid, amount looks wrong, needs a copy, needs a PO number, wants to pay in parts, or something else), can add a short note, and presses <b>Send to [your business name]</b>. Reminders pause while you look into it. There is no automatic resolution; you decide, mark it resolved or mark the invoice disputed or paid, and reminders only resume if you choose to let them.</P>

      <H2>Where you see it</H2>
      <P>Both land as an event on the customer and the invoice, and the explainer on the invoice page says plainly why a reminder is not going out: &quot;customer promised to pay by …&quot; or &quot;invoice is disputed&quot;. Neither action creates an email thread; if you want to talk it through, reply by hand or call.</P>

      <H2>Limits</H2>
      <P>Only invoices that are sent, viewed, overdue or partially paid can be acted on this way; a closed or already-disputed invoice has no buttons to press. A promise date can be at most 30 days out; for anything further out the page asks the customer to write to you directly.</P>
    </HelpArticle>
  );
}
