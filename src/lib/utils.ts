import { customAlphabet } from 'nanoid';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const nano = customAlphabet(ALPHABET, 12);
export const nanoid = () => nano();

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

/**
 * Escape a string for interpolation into HTML. Used for the notification
 * emails we send ourselves — those bodies mix operator-facing markup with
 * customer-supplied values (org names, contact names, free-text notes), so
 * every interpolated value has to be escaped or the customer controls the
 * markup that lands in the founder's inbox.
 *
 * NOTE: src/app/api/lead-notify and src/lib/outreach-inbound each still
 * carry a private copy of this; fold them in here when they're next touched.
 */
/**
 * Narrow an unknown thrown value to a message string.
 *
 * `catch (e: unknown)` then `errorMessage(e)` appeared in 23 places. It is not just a
 * lint complaint: `any` silences the check that the thing you caught is an
 * Error at all, and a thrown string or a rejected fetch Response would render
 * as "undefined" through that path rather than saying anything useful.
 */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try { return JSON.stringify(e) ?? String(e); } catch { return String(e); }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

export function formatCurrency(amount: number | string, currency = 'USD', locale = 'en-US') {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

export function formatDate(d: Date | string | null | undefined, locale = 'en-US') {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

export function daysBetween(a: Date | string, b: Date | string) {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Whole days a due date is PAST, or 0 when it is today or still in the future.
 *
 * Deliberately does not use daysBetween(): that helper returns an absolute
 * distance, so a date 26 days in the future came back as 26 and the
 * Math.max(0, ...) clamp never saw a negative to clamp. Every not-yet-due
 * invoice was therefore reported as 26 days overdue — the `current` aging
 * bucket was permanently empty, the dashboard showed 100% of A/R as overdue,
 * and the dunning templates told customers an invoice that isn't due yet was
 * already "26 days past due". Subtract in signed order and clamp once.
 */
export function daysOverdue(dueDate: Date | string) {
  const ms = Date.now() - new Date(dueDate).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';
export function bucketFor(days: number): AgingBucket {
  if (days <= 0) return 'current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

export const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$', GBP: '£', AUD: 'A$', CAD: 'C$', EUR: '€', KES: 'KSh', NGN: '₦', ZAR: 'R',
};

export const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', UK: 'GBP', AU: 'AUD', CA: 'CAD', IE: 'EUR', NZ: 'NZD',
  KE: 'KES', NG: 'NGN', ZA: 'ZAR', IN: 'INR',
};

// Client organizations bundled into the Practice plan, and the per-org price
// beyond that. Exported because the pricing page, the JSON-LD offers and the
// ROI calculator all have to agree on them.
export const PRACTICE_INCLUDED_ORGS = 10;
export const PRACTICE_EXTRA_ORG_MONTHLY = 25;

// Practice Scale's allowance, and the monthly prices the two practice tiers
// charge. Named rather than inlined so the allowance is written once: the copy
// below builds its prose from it, so a cap can no longer say one thing on the
// pricing page and another on the customer's own usage meter.
export const PRACTICE_SCALE_INCLUDED_ORGS = 100;
const PRACTICE_MONTHLY = 399;
const PRACTICE_SCALE_MONTHLY = 999;

// The book count where Practice-plus-overage stops being the cheaper plan.
// Derived, not written down: it falls out of the two prices and the per-org
// rate, so repricing any of the three moves it automatically instead of
// leaving a stale number in the marketing copy. At exactly this count the two
// plans cost the same; past it Scale wins.
export const PRACTICE_SCALE_CROSSOVER_ORGS =
  PRACTICE_INCLUDED_ORGS +
  Math.ceil((PRACTICE_SCALE_MONTHLY - PRACTICE_MONTHLY) / PRACTICE_EXTRA_ORG_MONTHLY);

// Keys are pinned to the db schema's plan_tier enum (starter | growth |
// scale | enterprise) as a literal duplicate rather than importing
// PlanTier from @/db/schema, which would create a circular import
// (schema.ts already imports nanoid from this file). The literal key
// union (instead of the old `Record<string, ...>`) means PlanKey
// (= keyof typeof PLAN_PRICING) downstream in billing.ts type-checks
// against the enum without any `as any` casts.
//
// Priced per connected client organization rather than per monitored invoice.
// Invoice counts meter the wrong thing: they are invisible to the buyer at the
// moment of purchase and they charge the best customers the most. A practice
// connects N client books, knows N on day one, and N is what drives our cost.
export const PLAN_PRICING: Record<'starter' | 'growth' | 'scale' | 'enterprise', {
  monthly: number;
  name: string;
  popular?: boolean;
  audience: string;
  /** Human-readable org allowance, for pricing copy. */
  orgs: string;
  /** Machine-readable allowances, for the in-app usage meters. The billing
   *  page used to keep its own PLAN_LIMITS table, which drifted: it still
   *  capped Starter at 50 invoices and 1 user long after the plan changed. */
  includedOrgs: number | 'unlimited';
  users: number | 'unlimited';
  features: string[];
}> = {
  starter: {
    monthly: 149,
    name: 'Single business',
    audience: 'One business chasing its own invoices',
    orgs: '1 organization',
    includedOrgs: 1,
    users: 3,
    features: ['AR aging dashboard', 'AI dunning (email + SMS)', 'Payment portal', 'Xero or QuickBooks', 'Customer risk scoring', 'DSO tracking', '3 users', 'Unlimited invoices'],
  },
  growth: {
    monthly: PRACTICE_MONTHLY,
    name: 'Practice',
    popular: true,
    audience: 'Bookkeepers and accountants chasing AR across client books',
    orgs: `Up to ${PRACTICE_INCLUDED_ORGS} client organizations, then $${PRACTICE_EXTRA_ORG_MONTHLY}/org`,
    includedOrgs: PRACTICE_INCLUDED_ORGS,
    users: 'unlimited',
    features: ['Everything in Single business', 'Per-client branding and tone', 'Consolidated AR across all client books', 'Cash-flow forecast', 'Multi-currency', 'Unlimited users'],
  },
  scale: {
    monthly: PRACTICE_SCALE_MONTHLY,
    name: 'Practice Scale',
    audience: `Practices past ${PRACTICE_SCALE_CROSSOVER_ORGS} client books, or any practice that needs API access and SSO`,
    orgs: `Up to ${PRACTICE_SCALE_INCLUDED_ORGS} client organizations`,
    includedOrgs: PRACTICE_SCALE_INCLUDED_ORGS,
    users: 'unlimited',
    features: ['Everything in Practice', 'AI collections concierge', 'Custom workflows', 'API access', 'SSO', 'Priority support'],
  },
  enterprise: {
    monthly: 2499,
    name: 'Enterprise',
    audience: 'Networks and franchises',
    orgs: 'Unlimited client organizations',
    includedOrgs: 'unlimited',
    users: 'unlimited',
    features: ['Everything in Practice Scale', 'Dedicated success manager', 'Custom integrations', 'SLA', 'SOC 2 reporting', 'White-glove onboarding'],
  },
};

// Founding offer. Deliberately a time-boxed discount off list rather than a low
// list price: a permanently low headline number cannot be walked back, and
// "locked for life" on the first cohort commits us before we know our own
// serving costs. The discount is visible, the anchor survives, and we still
// learn what people will actually pay.
export const FOUNDING = {
  discountPct: 40,
  months: 12,
  seats: 10,
  /** Discounted monthly price for a plan, rounded to the nearest dollar. */
  monthly(plan: keyof typeof PLAN_PRICING): number {
    return Math.round((PLAN_PRICING[plan].monthly * (100 - FOUNDING.discountPct)) / 100);
  },
} as const;
