import { pageMetadata } from '@/lib/seo';
import { HelpArticle, H2, P } from '../_lib/article';

export const metadata = pageMetadata({
  title: 'Billing, plans and your trial',
  description: 'How the 14-day trial works, how billing works today while card checkout is off, and what a text message costs.',
  path: '/help/billing-plans-and-your-trial',
  keywords: ['Mugavi free trial', 'Mugavi billing', 'manual invoice Mugavi'],
});

export default function Page() {
  return (
    <HelpArticle
      title="Billing, plans and your trial"
      lead="Sign up and you get 14 days of full access with no credit card required. It does not turn into a paid plan on its own."
    >
      <H2>The trial</H2>
      <ul className="mt-4 list-disc pl-5 space-y-2 text-ink-700">
        <li>14 days, full access, no card taken at signup.</li>
        <li>Nothing is charged automatically when it ends.</li>
        <li>Pick a plan from Dashboard, then Billing, when you are ready to continue.</li>
      </ul>

      <H2>How you are billed today</H2>
      <P>Card checkout is not switched on yet, so billing is by manual invoice. Choose a plan on the Billing page and David emails your invoice within one business day. Once it is paid, your account is upgraded by hand and you get a confirmation email. Nothing is charged automatically at any point.</P>

      <H2>Text messages</H2>
      <P>Email reminders and AI-drafted messages are included in every plan. Text messages are billed separately, at carrier cost with no markup, and the count is shown on your invoice.</P>

      <H2>Practice plan: extra client books</H2>
      <P>The Practice plan covers a set number of client books; extra books beyond that are billed by hand at a flat amount each. Nothing is charged automatically and no book is ever blocked while billing is sorted out.</P>

      <H2>No published invoice limit</H2>
      <P>Plans are priced per client book, not per invoice. If your use goes far beyond ordinary (tens of thousands of reminders a month), we talk with you first and agree a plan before anything changes.</P>
    </HelpArticle>
  );
}
