import { pageMetadata } from '@/lib/seo';
import { HelpArticle, H2, P } from '../_lib/article';

export const metadata = pageMetadata({
  title: 'How to stop a reminder',
  description: 'Pause one customer, skip a single scheduled reminder, mark an invoice paid or disputed, or turn off automatic reminders entirely.',
  path: '/help/how-to-stop-a-reminder',
  keywords: ['stop invoice reminder', 'pause reminders Mugavi', 'cancel scheduled reminder'],
});

export default function Page() {
  return (
    <HelpArticle
      title="How to stop a reminder"
      lead="What you want to stop decides where you click. Here are the four ways, from one customer to everything."
    >
      <H2>Stop reminders to one customer</H2>
      <P>Open Dashboard, then Customers, then that customer, and find <b>Automatic reminders</b>. Press <b>Pause reminders</b>. You can pick an end date or leave it open and press <b>Resume reminders</b> yourself later. A paused customer gets nothing from the scheduler, but you can still send a reminder, a statement, or a reply by hand while paused.</P>

      <H2>Cancel one reminder waiting to send</H2>
      <P>If a reminder is in the approval queue on the Dunning page, you can simply not approve it, or remove it from the queue. If you already pressed send and the 30-second countdown is still running, press <b>Undo</b> before it ends, or close the page: the countdown runs in your browser, so closing the page also cancels it and the reminder is never sent.</P>

      <H2>Stop one invoice from being chased again</H2>
      <P>Mark the invoice paid, written off, or disputed, and the scheduler stops it: a reminder is never drafted for an invoice that is paid, void, a draft, written off, or disputed. A customer can also open the dispute themselves from the payment page; see <a className="underline" href="/help/customer-promises-and-disputes">when a customer says something is wrong</a>.</P>

      <H2>Turn off reminders for everyone</H2>
      <P>There is no single master switch yet. Pause each customer you want left alone, or remove the steps from your reminder schedule in Dunning, then Settings. Approval stays on by default either way, so even with schedules running, nothing reaches a customer until you approve it.</P>

      <H2>A reply pauses it for you</H2>
      <P>If a customer replies to a reminder, that invoice is held until you have read the reply: the approval queue will not let a new reminder for that invoice go out while a reply is unhandled.</P>
    </HelpArticle>
  );
}
