/**
 * Every help page, in one list. Feeds the help index (grouped by category) and
 * the sitemap, so a page that exists but is missing from here is a bug the
 * tests catch rather than a page nobody can find. Keep slugs equal to the
 * folder name under src/app/help/.
 */
export type HelpCategory = 'Getting connected' | 'Reminders' | 'Money matters' | 'Your account';

export type HelpPage = {
  slug: string;
  title: string;
  summary: string;
  category: HelpCategory;
};

export const HELP_PAGES: HelpPage[] = [
  // Getting connected
  { slug: 'connect-quickbooks-or-xero', title: 'Connect QuickBooks or Xero, or import a spreadsheet', summary: 'Three ways to bring in customers and invoices, what each reads and writes, and how to disconnect.', category: 'Getting connected' },
  { slug: 'connection-shows-an-error-or-reconnect', title: 'Your connection shows an error, or you need to reconnect', summary: 'What the Error badge and a failed-connection banner mean, and how to fix them.', category: 'Getting connected' },
  { slug: 'why-cant-i-see-my-invoices-after-connecting', title: "Why can't I see my invoices after connecting", summary: 'Wrong workspace, sync not run yet, only open invoices, or a sandbox company.', category: 'Getting connected' },
  { slug: 'import-from-a-spreadsheet', title: 'Import from a spreadsheet (CSV), in detail', summary: 'The exact columns, limits, and what happens when you re-upload.', category: 'Getting connected' },
  { slug: 'send-from-your-domain', title: 'Send reminders from your own domain', summary: 'Set up SPF, DKIM and DMARC so reminders come from your address.', category: 'Getting connected' },
  // Reminders
  { slug: 'approvals-and-the-30-second-undo', title: 'Approvals and the 30-second undo', summary: 'Why nothing goes out until you press send, and how the undo window works.', category: 'Reminders' },
  { slug: 'how-to-stop-a-reminder', title: 'How to stop a reminder', summary: 'Pause one customer, skip one invoice, or turn off a step for good.', category: 'Reminders' },
  { slug: 'what-your-customer-receives', title: 'Who sees what: what your customer receives', summary: 'What a reminder, statement or text looks like from the other side.', category: 'Reminders' },
  { slug: 'customer-promises-and-disputes', title: 'When a customer says "I will pay" or "something is wrong"', summary: 'What the two payment-page buttons do, and where you see the answer.', category: 'Reminders' },
  { slug: 'text-message-reminders-and-consent', title: 'Text message reminders and consent', summary: 'Why a text might be skipped, and what STOP and START do.', category: 'Reminders' },
  // Money matters
  { slug: 'customer-statements', title: 'Send a customer statement', summary: 'Print, download or email a statement of everything a customer owes.', category: 'Money matters' },
  { slug: 'late-fees', title: 'Set up late fees', summary: 'Propose, apply or waive a late fee. Nothing is charged automatically.', category: 'Money matters' },
  // Your account
  { slug: 'billing-plans-and-your-trial', title: 'Billing, plans and your trial', summary: 'How the 14-day trial works and how you are billed today.', category: 'Your account' },
  { slug: 'cancel-or-change-your-plan', title: 'Cancel or change your plan', summary: 'A plain request, by hand. No cancellation fee, no contract.', category: 'Your account' },
  { slug: 'export-your-data', title: 'Export your data', summary: 'Download everything as a ZIP, or one CSV at a time.', category: 'Your account' },
  { slug: 'delete-a-client-book-or-your-account', title: 'Delete a client book or your account', summary: 'What gets deleted right away, and what to download first.', category: 'Your account' },
];

export const HELP_CATEGORIES: HelpCategory[] = ['Getting connected', 'Reminders', 'Money matters', 'Your account'];
