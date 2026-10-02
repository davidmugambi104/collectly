/**
 * Which outside services Mugavi needs, and whether each is configured.
 *
 * Booleans only: this never returns a value, so it is safe to render for an admin.
 * `needed` says when it matters: 'now' stops the product working or the plan going
 * forward, 'soon' is needed before real customers, 'later' is optional or dormant.
 */
export type Needed = 'now' | 'soon' | 'later';

export type ServiceDef = {
  id: string;
  name: string;
  why: string;
  needed: Needed;
  /** Every one of these must be set for the service to count as configured. */
  vars: string[];
  /** Where to get the keys. */
  where: string;
  /** What stops working without it. */
  without: string;
};

export const SERVICES: ServiceDef[] = [
  { id: 'db', name: 'Postgres database', why: 'All customer, invoice and reminder data.', needed: 'now', vars: ['DATABASE_URL'], where: 'Your Postgres host (Neon, Supabase, etc.)', without: 'Nothing works.' },
  { id: 'clerk', name: 'Clerk sign-in', why: 'Accounts and client organizations.', needed: 'now', vars: ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'], where: 'dashboard.clerk.com', without: 'Nobody can sign in.' },
  { id: 'clerk-host', name: 'Clerk bound to mugavi.com', why: 'Until this is set, sign-in and the dashboard redirect to the old getcollectly.app domain.', needed: 'now', vars: ['NEXT_PUBLIC_CLERK_ON_PUBLIC_HOST', 'CLERK_ON_PUBLIC_HOST'], where: 'Clerk dashboard: production instance domain, then set both to 1', without: 'Visitors from mugavi.com sign up on a different domain.' },
  { id: 'resend', name: 'Resend email', why: 'Sends reminders, statements and replies.', needed: 'now', vars: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'], where: 'resend.com', without: 'No reminder email can be sent.' },
  { id: 'resend-hooks', name: 'Resend delivery webhook', why: 'Tells us when mail bounces or is delivered.', needed: 'soon', vars: ['RESEND_DELIVERY_WEBHOOK_SECRET'], where: 'Resend dashboard, Webhooks', without: 'Bounces and delivery are not recorded.' },
  { id: 'inbound', name: 'Reply inbox (IMAP)', why: 'Brings customer replies back into the Inbox.', needed: 'soon', vars: ['AR_DUNNING_IMAP_USER', 'AR_DUNNING_IMAP_APP_PASSWORD'], where: 'The mailbox that receives replies (an app password)', without: 'Replies never reach the Inbox.' },
  { id: 'xero', name: 'Xero', why: 'Sync invoices, customers and credit notes.', needed: 'now', vars: ['XERO_CLIENT_ID', 'XERO_CLIENT_SECRET', 'XERO_REDIRECT_URI'], where: 'developer.xero.com, My Apps', without: 'Xero cannot be connected.' },
  { id: 'qbo', name: 'QuickBooks Online', why: 'Sync invoices, customers and credit memos. The first market in the plan.', needed: 'now', vars: ['QBO_CLIENT_ID', 'QBO_CLIENT_SECRET', 'QBO_REDIRECT_URI', 'QBO_ENVIRONMENT'], where: 'developer.intuit.com, My Hub, your app (production keys need Intuit\'s app review)', without: 'QuickBooks cannot be connected.' },
  { id: 'redis', name: 'Upstash Redis', why: 'One-time codes for connecting Xero and QuickBooks safely.', needed: 'now', vars: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'], where: 'upstash.com', without: 'Connecting an accounting system can fail.' },
  { id: 'secrets', name: 'Cron and state secrets', why: 'Protects the scheduled reminder run and the connect flow.', needed: 'now', vars: ['CRON_SECRET', 'OAUTH_STATE_SECRET', 'DUNNING_TRIGGER_SECRET'], where: 'Generate long random strings yourself', without: 'Scheduled reminders will not run safely.' },
  { id: 'tokens', name: 'Token encryption', why: 'Encrypts the stored Xero and QuickBooks access tokens, so a database leak does not expose customers\' books. Intuit and Xero reviews ask about this.', needed: 'now', vars: ['INTEGRATION_TOKEN_KEY'], where: 'Generate it yourself: openssl rand -hex 32. Keep a copy somewhere safe; losing it means everyone must reconnect', without: 'Tokens are stored as plain text.' },
  { id: 'ai', name: 'Gemini AI', why: 'Drafts the reminder wording.', needed: 'now', vars: ['GEMINI_API_KEY'], where: 'aistudio.google.com', without: 'Reminders fall back to plain templates.' },
  { id: 'posthog', name: 'PostHog analytics', why: 'Product analytics, after the visitor consents.', needed: 'soon', vars: ['NEXT_PUBLIC_POSTHOG_KEY'], where: 'posthog.com', without: 'No usage analytics.' },
  { id: 'twilio', name: 'Twilio SMS', why: 'Text reminders for customers who opted in.', needed: 'later', vars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'], where: 'twilio.com (toll-free numbers need verification)', without: 'No SMS reminders.' },
  { id: 'billing', name: 'Card billing', why: 'Charging customers automatically. Billing is manual (bank transfer) until this exists.', needed: 'soon', vars: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], where: 'Stripe, or a merchant of record such as Paddle that handles US and UK sales tax. Pick whichever can pay out to your business entity', without: 'Every customer is invoiced by hand.' },
  { id: 'paystack', name: 'Paystack', why: 'African card payments. Not a target market, so leave it dormant.', needed: 'later', vars: ['PAYSTACK_SECRET_KEY'], where: 'paystack.com', without: 'Nothing the product relies on.' },
  { id: 'plaid', name: 'Plaid', why: 'Bank link. Not used by the forecast yet.', needed: 'later', vars: ['PLAID_CLIENT_ID', 'PLAID_SECRET', 'PLAID_ENV'], where: 'plaid.com', without: 'Nothing the product relies on.' },
  { id: 'square', name: 'Square', why: 'Sync from Square. Not a target market.', needed: 'later', vars: ['SQUARE_CLIENT_ID', 'SQUARE_CLIENT_SECRET', 'SQUARE_REDIRECT_URI'], where: 'developer.squareup.com', without: 'Nothing the product relies on.' },
];

export type ServiceStatus = ServiceDef & { configured: boolean; missing: string[] };

/** Pure: pass in the environment so tests do not touch the real one. Values are never kept. */
export function configStatus(env: Record<string, string | undefined>): ServiceStatus[] {
  return SERVICES.map((s) => {
    const missing = s.vars.filter((v) => !env[v] || env[v]!.trim() === '');
    return { ...s, configured: missing.length === 0, missing };
  });
}

const ORDER: Record<Needed, number> = { now: 0, soon: 1, later: 2 };

/** What to do next: unconfigured services, most urgent first. */
export function todoOrder(status: ServiceStatus[]): ServiceStatus[] {
  return status.filter((s) => !s.configured).sort((a, b) => ORDER[a.needed] - ORDER[b.needed]);
}
