/**
 * What a practice pays each month for the same set of client books, Mugavi
 * against Paidnice. Pure arithmetic, no imports, so it runs under node --test.
 *
 * Paidnice figures are the ones published at paidnice.com/pricing, read on
 * 2026-09-20 and re-read 2026-10-03: a Pro tier price chosen by monthly invoice
 * volume, plus $29 a month for every entity after the first. The invoice
 * allowance is shared across entities. Essentials ($69, 150 invoices) has no
 * multiple-entity support, so it only applies to a single book. Nobody has
 * confirmed with Paidnice that the entity add-on works exactly as read from the
 * page, so every caller must say the figures are read from their public page.
 */
export const PAIDNICE_ENTITY_MONTHLY = 29;
export const PAIDNICE_ESSENTIALS_MONTHLY = 69;
export const PAIDNICE_ESSENTIALS_INVOICES = 150;
export const PAIDNICE_PRO_TIERS: ReadonlyArray<readonly [invoices: number, monthly: number]> = [
  [300, 99],
  [600, 179],
  [1000, 279],
  [2000, 489],
  [3000, 649],
  [4000, 799],
];

export interface MugaviPrices {
  /** One business on its own. */
  single: number;
  /** Practice plan monthly price and the books it includes. */
  practice: number;
  practiceBooks: number;
  /** Price of each book past the included ones on Practice. */
  extraBook: number;
  /** Flat price for the largest plan and the books it covers. */
  scale: number;
  scaleBooks: number;
}

export type MugaviPlan = 'single' | 'singles' | 'practice' | 'scale';

export interface MugaviCost {
  monthly: number;
  plan: MugaviPlan;
}

export interface PaidniceCost {
  monthly: number;
  /** Which Paidnice plan the volume lands on, for showing the working. */
  tier: 'Essentials' | 'Pro';
  tierMonthly: number;
  invoiceCap: number;
  extraEntities: number;
}

/** Paidnice monthly cost, or null above their published 4,000-invoice tier (custom quote). */
export function paidniceCost(books: number, invoicesPerBook: number): PaidniceCost | null {
  if (!(books >= 1) || !(invoicesPerBook >= 0)) return null;
  const total = books * invoicesPerBook;
  if (books === 1 && total <= PAIDNICE_ESSENTIALS_INVOICES) {
    return {
      monthly: PAIDNICE_ESSENTIALS_MONTHLY,
      tier: 'Essentials',
      tierMonthly: PAIDNICE_ESSENTIALS_MONTHLY,
      invoiceCap: PAIDNICE_ESSENTIALS_INVOICES,
      extraEntities: 0,
    };
  }
  const tier = PAIDNICE_PRO_TIERS.find(([cap]) => total <= cap);
  if (!tier) return null;
  const extraEntities = books - 1;
  return {
    monthly: tier[1] + PAIDNICE_ENTITY_MONTHLY * extraEntities,
    tier: 'Pro',
    tierMonthly: tier[1],
    invoiceCap: tier[0],
    extraEntities,
  };
}

/**
 * Cheapest way to cover `books` client books on Mugavi. Each book is its own
 * organization, so a few books can be bought as separate single plans: that is
 * cheaper than Practice below the point where books x single reaches the
 * Practice price. Null when the books are past what the largest plan covers.
 */
export function mugaviCost(books: number, p: MugaviPrices): MugaviCost | null {
  if (!(books >= 1)) return null;
  if (books === 1) return { monthly: p.single, plan: 'single' };
  if (books > p.scaleBooks) return null;
  const separate = p.single * books;
  const onPractice =
    books <= p.practiceBooks ? p.practice : p.practice + p.extraBook * (books - p.practiceBooks);
  const practiceOrScale: MugaviCost =
    onPractice >= p.scale ? { monthly: p.scale, plan: 'scale' } : { monthly: onPractice, plan: 'practice' };
  return separate < practiceOrScale.monthly ? { monthly: separate, plan: 'singles' } : practiceOrScale;
}

/**
 * The smallest number of books from which Mugavi costs no more than Paidnice
 * for every larger number of books we can compare, at this invoice volume per
 * book. Null if there is no such point inside the plans we can price.
 */
export function crossoverBooks(invoicesPerBook: number, p: MugaviPrices): number | null {
  let crossover: number | null = null;
  for (let n = p.scaleBooks; n >= 2; n--) {
    const us = mugaviCost(n, p);
    const them = paidniceCost(n, invoicesPerBook);
    if (!us) continue;
    // Above Paidnice's last published tier they quote by hand: stop there, we
    // cannot say anything about that range.
    if (!them) continue;
    if (us.monthly <= them.monthly) crossover = n;
    else break;
  }
  return crossover;
}
