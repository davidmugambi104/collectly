import Stripe from 'stripe';

/**
 * Builds the Stripe client. STRIPE_API_BASE (for example http://127.0.0.1:12111) points the
 * SDK at a local stand-in so tests never reach real Stripe. Leave it unset in production.
 */
export function makeStripe(env: Record<string, string | undefined>): Stripe {
  const key = env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.trim() !== '' ? env.STRIPE_SECRET_KEY : 'PLACEHOLDER_FROM_ENV';
  const base = env.STRIPE_API_BASE?.trim();
  if (base) {
    const u = new URL(base);
    return new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
      host: u.hostname,
      port: u.port || (u.protocol === 'https:' ? '443' : '80'),
      protocol: u.protocol === 'https:' ? 'https' : 'http',
      maxNetworkRetries: 0,
    });
  }
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}
