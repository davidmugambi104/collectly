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

// Keys are pinned to the db schema's plan_tier enum (starter | growth |
// scale | enterprise) as a literal duplicate rather than importing
// PlanTier from @/db/schema, which would create a circular import
// (schema.ts already imports nanoid from this file). The literal key
// union (instead of the old `Record<string, ...>`) means PlanKey
// (= keyof typeof PLAN_PRICING) downstream in billing.ts type-checks
// against the enum without any `as any` casts.
export const PLAN_PRICING: Record<'starter' | 'growth' | 'scale' | 'enterprise', { monthly: number; name: string; popular?: boolean; features: string[] }> = {
  starter: { monthly: 49, name: 'Starter', features: ['AR aging dashboard', 'AI dunning (email)', '1 integration', '1 user', 'Up to 50 invoices'] },
  growth: { monthly: 99, name: 'Growth', popular: true, features: ['Everything in Starter', 'SMS dunning', 'Payment portal', 'Cash-flow forecast', '3 users', 'Unlimited invoices', 'Multi-currency'] },
  scale: { monthly: 199, name: 'Scale', features: ['Everything in Growth', 'AI collections concierge', 'Custom workflows', 'API access', 'Unlimited users', 'Priority support'] },
  enterprise: { monthly: 499, name: 'Enterprise', features: ['Everything in Scale', 'Dedicated success manager', 'Custom integrations', 'SLA', 'SOC 2 reporting', 'White-glove onboarding'] },
};
