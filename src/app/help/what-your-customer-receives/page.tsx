import { pageMetadata } from '@/lib/seo';
import { HelpArticle, H2, P } from '../_lib/article';

export const metadata = pageMetadata({
  title: 'Who sees what: what your customer receives',
  description: 'What a reminder email, a text message, and a statement look like to the person who owes you money.',
  path: '/help/what-your-customer-receives',
  keywords: ['what does a reminder email look like', 'invoice reminder customer view', 'Mugavi customer experience'],
});

export default function Page() {
  return (
    <HelpArticle
      title="Who sees what: what your customer receives"
      lead="You see drafts, queues and explainers. Your customer only ever sees a plain email, an optional text, or a statement, after you approve it."
    >
      <H2>A reminder email</H2>
      <P>Arrives from &quot;Your Business via Mugavi&quot;, or from your own address if you have connected your domain. It names the invoice and what is owed. If you turned on &quot;list other invoices&quot;, it also shows a short table of the customer&apos;s other overdue invoices and a total, under the main message. A heads-up sent before the due date never uses the word overdue.</P>
      <P>Below the message, a link opens the invoice&apos;s payment page. There, the customer can tap <b>Tell us the day I will pay</b> or <b>Something about this invoice is not right</b>, without writing an email. Either one pauses reminders and tells you.</P>

      <H2>A reply</H2>
      <P>If the customer replies to the email, it lands in your Inbox, not anyone else&apos;s mailbox. We do not connect to or read your customer&apos;s own mail.</P>

      <H2>A text message</H2>
      <P>Only sent if you turned on text reminders and the customer has opted in. They can reply STOP to opt out or START to opt back in at any time; those are the carrier&apos;s own keywords. Texts are billed at carrier cost, no markup.</P>

      <H2>A statement</H2>
      <P>A table of every open invoice, what is paid and left, days late, and a total, with any note you added above it. It is sent only when you press Email, never on a schedule.</P>

      <H2>What they never see</H2>
      <P>Your internal notes, your approval queue, the explainer&apos;s reasons, call task notes, or anything about other customers. A late fee shows as its own line under the invoice, if you have applied one; it never changes the invoice total they see elsewhere in their books.</P>
    </HelpArticle>
  );
}
