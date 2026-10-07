import { pageMetadata } from '@/lib/seo';
import { HelpArticle, H2, P } from '../_lib/article';

export const metadata = pageMetadata({
  title: 'Cancel or change your plan',
  description: 'How to ask to cancel or change your Mugavi plan. A manual request, no cancellation fee, no contract.',
  path: '/help/cancel-or-change-your-plan',
  keywords: ['cancel Mugavi plan', 'change plan Mugavi', 'Mugavi cancellation fee'],
});

export default function Page() {
  return (
    <HelpArticle
      title="Cancel or change your plan"
      lead="There is no cancellation fee and no contract. Billing is manual today, so cancelling or changing plan is a request, not a button that bills a card."
    >
      <H2>How to ask</H2>
      <ol className="mt-4 list-decimal pl-5 space-y-2 text-ink-700">
        <li>Open Dashboard, then Billing, and scroll to <b>Cancel or change plan</b>.</li>
        <li>Press <b>Ask to cancel my plan</b>, or choose a plan change.</li>
        <li>You get an on-screen confirmation that the request was received.</li>
      </ol>

      <H2>What happens next</H2>
      <P>David confirms by email, and nothing changes until he does. Once a cancellation takes effect, you are not charged again. If you pay by card or bank through Manage billing, you can also cancel or change your plan yourself from there, no request needed.</P>

      <H2>Your data</H2>
      <P>Cancelling your plan does not delete your account or your data. Your customers, invoices and reminder history stay exactly as they are; you keep using Mugavi during the request window. If you also want your data removed, see <a className="underline" href="/help/delete-a-client-book-or-your-account">delete a client book or your account</a>, and download a copy first with <a className="underline" href="/help/export-your-data">export your data</a>.</P>

      <H2>No survey, no save offer</H2>
      <P>Asking to cancel does not trigger a discount offer or a survey gate. If you want to tell us why, there is a note field, but it is optional.</P>
    </HelpArticle>
  );
}
