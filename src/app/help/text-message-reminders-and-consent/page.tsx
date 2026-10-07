import { pageMetadata } from '@/lib/seo';
import { HelpArticle, H2, P } from '../_lib/article';

export const metadata = pageMetadata({
  title: 'Text message reminders and consent',
  description: 'Why a text reminder might be skipped, and what STOP, START and HELP do.',
  path: '/help/text-message-reminders-and-consent',
  keywords: ['SMS reminder consent', 'STOP opt out Mugavi', 'text reminder skipped'],
});

export default function Page() {
  return (
    <HelpArticle
      title="Text message reminders and consent"
      lead="A text step only goes out to a customer who has opted in. Everyone else's text step is skipped, with the reason recorded, and not retried."
    >
      <H2>Why a text gets skipped</H2>
      <ul className="mt-4 list-disc pl-5 space-y-2 text-ink-700">
        <li>Text messaging (Twilio) is not set up for your workspace yet.</li>
        <li>The customer has no phone number on file.</li>
        <li>The customer has not opted in to SMS.</li>
      </ul>
      <P>A skipped text step is not retried later; the rest of the schedule carries on as normal.</P>

      <H2>The keywords</H2>
      <P>These match the carrier&apos;s own reserved words, not ones we invented, so our record agrees with what the phone network already did.</P>
      <ul className="mt-4 list-disc pl-5 space-y-2 text-ink-700">
        <li><b>Opt out:</b> STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, REVOKE, OPTOUT.</li>
        <li><b>Opt in:</b> YES, START, UNSTOP, JOIN, Y, OPTIN.</li>
        <li><b>HELP or INFO</b> asks the carrier for help text; it does not change consent either way.</li>
      </ul>
      <P>Only a reply that is exactly one of these words counts, punctuation and case aside. &quot;Stop sending invoices to the wrong address&quot; is a sentence, not an opt-out.</P>

      <H2>Cost</H2>
      <P>Texts are passed on at carrier cost, with no markup. Billing for texts is manual today: the line is added by hand from the real carrier bill, not estimated.</P>

      <H2>See the status</H2>
      <P>Open Dashboard, then SMS consent, for who has opted in, opted out, or never replied either way.</P>
    </HelpArticle>
  );
}
