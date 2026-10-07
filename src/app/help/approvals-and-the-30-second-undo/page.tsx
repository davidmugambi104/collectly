import { pageMetadata } from '@/lib/seo';
import { HelpArticle, H2, P } from '../_lib/article';

export const metadata = pageMetadata({
  title: 'Approvals and the 30-second undo',
  description: 'Why nothing reaches your customer until you approve it, and how the 30-second undo window works before anything sends.',
  path: '/help/approvals-and-the-30-second-undo',
  keywords: ['Mugavi approval queue', '30 second undo', 'approve reminder before send'],
});

export default function Page() {
  return (
    <HelpArticle
      title="Approvals and the 30-second undo"
      lead="Approval is on by default for every new workspace. Nothing reaches your customer until you look at it and press send."
    >
      <H2>Where drafts wait</H2>
      <P>Open Dashboard, then Dunning. Reminders the scheduler has drafted sit in a queue there. You can edit the subject or message before approving; a blank edit just keeps the draft as written.</P>

      <H2>What can block a draft even after you approve</H2>
      <P>Mugavi re-checks right when you press approve, because a draft can sit for days. It will not send if: the invoice is now paid, written off, disputed or void; the customer has unsubscribed; the customer has an unread reply waiting in your Inbox; or, for a text, the customer has no phone number, has not opted in, or text messaging is not set up. These checks are never skipped, even by you approving: your approval is not the same thing as the recipient&apos;s consent.</P>

      <H2>The 30-second undo</H2>
      <P>Pressing send or approve starts a 30-second countdown, shown on screen. Press <b>Undo</b> any time before it ends and nothing is sent. The countdown runs in your browser, not on a server, so closing the page also cancels it; the reminder simply stays where it was. The same 30-second hold applies to statements and to replies sent from the Inbox.</P>

      <H2>What this does not do</H2>
      <P>It does not retry a message you undid. It does not notify the customer that something almost arrived. And it does not apply to anything the scheduler has not drafted yet; it only guards messages that are actually about to go out.</P>
    </HelpArticle>
  );
}
