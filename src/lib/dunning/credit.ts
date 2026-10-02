/**
 * Credit a customer holds that has not been applied yet.
 *
 * If it covers what they owe, there is nothing to chase: the right move is to apply
 * the credit in the books. Reviewers of the biggest competitor name this as a way a
 * good customer gets annoyed. Pure on purpose; the scheduler and the explainer both
 * use it so they cannot disagree.
 */

/** True when the credit is at least what the customer owes in that currency. Cents, so 0.1 + 0.2 never flips it. */
export function creditCoversOwed(credit: number | null | undefined, owed: number): boolean {
  const c = Math.round((credit ?? 0) * 100);
  const o = Math.round(owed * 100);
  return c > 0 && o > 0 && c >= o;
}

/** Total of several credit notes or memos for one customer and currency, in whole cents. */
export function sumCredits(amounts: Array<number | null | undefined>): number {
  const cents = amounts.reduce<number>((t, a) => t + (Number.isFinite(a) && (a as number) > 0 ? Math.round((a as number) * 100) : 0), 0);
  return cents / 100;
}

export type FoundCredit = { customerExternalId: string; currency: string; amount: number };

/** Group raw credit lines into one total per customer and currency. Pure. */
export function groupCredits(found: FoundCredit[]): Array<FoundCredit> {
  const by = new Map<string, number[]>();
  for (const f of found) {
    if (!f.customerExternalId || !f.currency) continue;
    const key = `${f.customerExternalId}\u0000${f.currency.toUpperCase()}`;
    by.set(key, [...(by.get(key) ?? []), f.amount]);
  }
  const out: FoundCredit[] = [];
  for (const [key, amounts] of by) {
    const [customerExternalId, currency] = key.split('\u0000');
    const amount = sumCredits(amounts);
    if (amount > 0) out.push({ customerExternalId, currency, amount });
  }
  return out;
}

