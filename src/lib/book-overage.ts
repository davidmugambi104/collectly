/**
 * How many client books a plan covers, and what the extra ones cost.
 *
 * The rule, decided 2026-10-02: the plan lives on one organization, books past the
 * included count are billed at the plan's per-book price on the same invoice, and
 * nothing is ever blocked. Billing is manual while card payments are not set up, so
 * the page just says plainly what will be charged.
 */
export type BookOverage =
  | { kind: 'within' }
  | { kind: 'upgrade'; books: number }
  | { kind: 'extra'; extra: number; monthly: number };

export function bookOverage(opts: { books: number; included: number | 'unlimited'; extraMonthly: number }): BookOverage {
  const { books, included, extraMonthly } = opts;
  if (included === 'unlimited' || books <= included) return { kind: 'within' };
  // A plan for one business has no per-book price: running several books is the Practice plan.
  if (included <= 1) return { kind: 'upgrade', books };
  const extra = books - included;
  return { kind: 'extra', extra, monthly: extra * extraMonthly };
}
