/**
 * The one place that says how Mugavi's own subscription is billed. Every customer-facing
 * page reads from here so the wording cannot drift.
 *
 * The switch is stripeBillingStatus(env).checkoutReady (key, webhook secret and every price
 * id set). Callers pass that boolean in: `billingCopy(stripeBillingStatus(process.env).checkoutReady)`.
 *
 * Truth today: everyone is invoiced by hand. Card and US bank (ACH) checkout is built and
 * switches on by itself once the owner sets the Stripe settings. Accounts already on a manual
 * invoice stay on it until they ask to move. US and UK only: nothing here may name other
 * regions or local payment methods (billing-copy.test.ts scans the marketing pages).
 */
import { FOUNDING } from './utils.ts';

export type BillingCopy = {
  checkoutReady: boolean;
  /** One sentence, for badges and short notes. */
  short: string;
  /** Pricing FAQ: "How does billing work?" */
  howBillingWorks: string;
  /** Terms of service, Billing section. The page appends the change and cancel sentence. */
  terms: string;
  /** llms.txt line. */
  llms: string;
  /** Dashboard billing page note for accounts that are not yet on a Stripe subscription. */
  dashboardNote: string;
  /** Dashboard footnote under the plan cards. */
  dashboardFootnote: string;
  /** For/* pages: how a practice pays. */
  forPagesLine: string;
  /** Pricing FAQ: "What if I outgrow my plan?" */
  outgrow: string;
};

const FOUNDING_LINE = `The first ${FOUNDING.seats} founding customers take ${FOUNDING.discountPct}% off for ${FOUNDING.months} months, applied by hand on the invoice.`;

export function billingCopy(checkoutReady: boolean): BillingCopy {
  if (checkoutReady) {
    return {
      checkoutReady,
      short: 'Pay by card or US bank account (ACH) after the 14-day trial. Accounts already on a manual invoice stay on it until they ask to move.',
      howBillingWorks: `After the 14-day trial you pick a plan and pay by card or US bank account (ACH) through Stripe checkout. Nothing is charged during the trial. Accounts that were set up on a manual invoice stay on it until they ask to move. ${FOUNDING_LINE}`,
      terms: 'The 14-day trial requires no payment method and does not automatically convert to a paid subscription. After the trial you can subscribe by card or US bank account (ACH) through Stripe checkout, and you can manage your payment method from the Billing page. Accounts set up on a manual invoice stay on it until they ask to move.',
      llms: 'Billing: after the trial, card or US bank (ACH) checkout through Stripe. Accounts set up on a manual invoice stay on it until they ask to move.',
      dashboardNote: 'Pay by card or US bank account (ACH). Accounts set up on a manual invoice stay on it until you ask to move.',
      dashboardFootnote: 'Accounts set up on a manual invoice stay on it. To move to card or bank billing, email David.',
      forPagesLine: 'after the 14-day trial you pay by card or US bank account (ACH) at checkout',
      outgrow: 'Change your plan from Billing. Accounts on a manual invoice request the change and David sends a new invoice within one business day.',
    };
  }
  return {
    checkoutReady,
    short: 'Billing is a manual invoice for everyone today. Card and US bank (ACH) checkout is built but not switched on yet.',
    howBillingWorks: `Billing is a manual invoice for everyone today. After the 14-day trial David emails you an invoice in US dollars, and nothing is charged automatically. Card and US bank (ACH) checkout is built but not switched on yet, and there is no date for it. ${FOUNDING_LINE}`,
    terms: 'The 14-day trial requires no payment method and does not automatically convert to a paid subscription. Billing is a manual invoice for every customer today: after the trial, continued use is billed by an invoice we email you, and nothing is charged automatically. Card and US bank (ACH) checkout is built but not switched on yet.',
    llms: 'Billing today is a manual invoice for every customer, emailed by the founder after the trial. Card and US bank (ACH) checkout is built but not switched on yet.',
    dashboardNote: 'Billing is a manual invoice for everyone today. David emails your invoice and nothing is charged automatically. Card and US bank (ACH) checkout is built but not switched on yet.',
    dashboardFootnote: 'Billing is a manual invoice for everyone today, so an upgrade has a short wait (up to one business day) between click and confirmation. Same price, same plan. Card and US bank (ACH) checkout is not switched on yet.',
    forPagesLine: 'billed by manual invoice in US dollars for now; card and US bank (ACH) checkout is not switched on yet',
    outgrow: 'Request an upgrade from Billing: David reviews and sends an invoice within one business day. Not self-serve yet.',
  };
}

/** Pricing FAQ: customers paying invoices through the branded payment page (a separate matter from Mugavi's own billing). */
export const PORTAL_PAYMENT_ANSWER =
  'Wire transfer today, for every customer. Card and US bank (ACH) payments on the payment page are built but switched off while we finish routing payments to your own Stripe account instead of ours. No timeline promises until that is done.';

