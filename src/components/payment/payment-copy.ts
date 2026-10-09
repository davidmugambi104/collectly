/** Customer-facing wording on the payment page. Plain functions so they can be tested. */

export type PayMethod = 'card' | 'ach' | 'wire' | 'paystack' | 'square';

/** The amber notice shown when card/ACH is not available. Names the business, not its internal slug. */
export function noCardNotice(orgName: string | null | undefined, paystackEligible: boolean): string {
  const who = orgName?.trim() || 'This business';
  return `${who} has not set up online card payments yet. ${paystackEligible ? 'Pay with Paystack or by bank transfer below.' : 'You can pay by bank transfer: use the button below to ask for their bank details.'}`;
}

/** The small "Powered by" line under the pay button. Wire transfers do not go through a processor, so they get none. */
export function poweredByLabel(method: PayMethod): string | null {
  if (method === 'paystack') return 'Powered by Paystack';
  if (method === 'square') return 'Powered by Square';
  if (method === 'card' || method === 'ach') return 'Powered by Stripe · PCI DSS Level 1';
  return null;
}
