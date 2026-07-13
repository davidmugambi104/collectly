import { customAlphabet } from 'nanoid';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const nano = customAlphabet(ALPHABET, 12);
export const nanoid = () => nano();

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

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

export function daysOverdue(dueDate: Date | string) {
  return Math.max(0, daysBetween(new Date(), dueDate));
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

export const PLAN_PRICING: Record<string, { monthly: number; name: string; popular?: boolean; features: string[] }> = {
  starter: { monthly: 49, name: 'Starter', features: ['AR aging dashboard', 'AI dunning (email)', '1 integration', '1 user', 'Up to 50 invoices'] },
  growth: { monthly: 99, name: 'Growth', popular: true, features: ['Everything in Starter', 'SMS dunning', 'Payment portal', 'Cash-flow forecast', '3 users', 'Unlimited invoices', 'Multi-currency'] },
  scale: { monthly: 199, name: 'Scale', features: ['Everything in Growth', 'AI collections concierge', 'Custom workflows', 'API access', 'Unlimited users', 'Priority support'] },
  enterprise: { monthly: 499, name: 'Enterprise', features: ['Everything in Scale', 'Dedicated success manager', 'Custom integrations', 'SLA', 'SOC 2 reporting', 'White-glove onboarding'] },
};
