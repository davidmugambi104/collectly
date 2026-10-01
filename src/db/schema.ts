import {
  pgTable, text, varchar, timestamp, integer, smallint, boolean, decimal, jsonb, index, uniqueIndex, pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

/* ----------------------------- ENUMS ----------------------------- */

export const userRole = pgEnum('user_role', ['owner', 'admin', 'member', 'viewer']);
export const integrationStatus = pgEnum('integration_status', ['connected', 'disconnected', 'error', 'pending']);
export const integrationProvider = pgEnum('integration_provider', ['quickbooks', 'xero', 'stripe', 'square', 'plaid']);
export const invoiceStatus = pgEnum('invoice_status', ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'disputed', 'written_off']);
export const dunningChannel = pgEnum('dunning_channel', ['email', 'sms', 'phone', 'letter']);
// SMS consent, tracked separately from customers.dndAt. dndAt is a blanket
// "stop all dunning" switch; this is specifically the express written consent
// Twilio requires for toll-free verification, and it starts at 'none' rather
// than assuming a phone number on file implies permission to text it.
export const smsConsentStatus = pgEnum('sms_consent_status', ['none', 'pending', 'opted_in', 'opted_out']);
export const smsConsentEventType = pgEnum('sms_consent_event_type', ['invite_sent', 'opted_in', 'opted_out']);
export const dunningStatus = pgEnum('dunning_status', ['scheduled', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'paid', 'failed', 'cancelled']);
export const planTier = pgEnum('plan_tier', ['starter', 'growth', 'scale', 'enterprise']);
export const subStatus = pgEnum('sub_status', ['trialing', 'active', 'past_due', 'cancelled', 'incomplete']);

/* ----------------------------- USERS / ORGS ----------------------------- */

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  baseCurrency: varchar('base_currency', { length: 3 }).notNull().default('USD'),
  country: varchar('country', { length: 2 }).notNull().default('US'),
  timezone: text('timezone').notNull().default('UTC'),
  businessType: text('business_type'),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: planTier('plan').notNull().default('starter'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  slugIdx: uniqueIndex('orgs_slug_idx').on(t.slug),
}));

export const memberships = pgTable('memberships', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: userRole('role').notNull().default('owner'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pairIdx: uniqueIndex('memberships_pair_idx').on(t.userId, t.orgId),
}));

/* ----------------------------- CUSTOMERS ----------------------------- */

export const customers = pgTable('customers', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  externalId: text('external_id'), // ID in QBO / Xero
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  preferredChannel: dunningChannel('preferred_channel').notNull().default('email'),
  paymentBehavior: jsonb('payment_behavior').$type<{
    avgDaysToPay: number;
    paidRate: number; // 0..1
    lastPaidAt: string | null;
    riskScore: number; // 0..100
  }>().default({ avgDaysToPay: 30, paidRate: 1, lastPaidAt: null, riskScore: 20 }),
  notes: text('notes'),
  // When set, skip all dunning sends (email + SMS) for this customer.
  // Set via /api/unsubscribe or future in-app preference. Honored by the
  // dunning scheduler and the manual send endpoint.
  dndAt: timestamp('dnd_at', { withTimezone: true }),
  // Express consent for SMS specifically. Defaults to 'none': having a phone
  // number is not permission to text it, and Twilio's toll-free verification
  // requires proof that the recipient opted in.
  smsConsentStatus: smsConsentStatus('sms_consent_status').notNull().default('none'),
  smsConsentAt: timestamp('sms_consent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  orgIdx: index('customers_org_idx').on(t.orgId),
  extIdx: index('customers_ext_idx').on(t.orgId, t.externalId),
}));

/* ----------------------------- INVOICES ----------------------------- */

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  externalId: text('external_id'),
  number: text('number').notNull(),
  status: invoiceStatus('status').notNull().default('draft'),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  amountPaid: decimal('amount_paid', { precision: 14, scale: 2 }).notNull().default('0'),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  issueDate: timestamp('issue_date', { withTimezone: true }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  description: text('description'),
  lineItems: jsonb('line_items').$type<Array<{ description: string; quantity: number; unitPrice: number; total: number }>>(),
  paymentLink: text('payment_link'),
  lastReminderAt: timestamp('last_reminder_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  orgIdx: index('invoices_org_idx').on(t.orgId),
  statusIdx: index('invoices_status_idx').on(t.orgId, t.status),
  dueIdx: index('invoices_due_idx').on(t.dueDate),
  custIdx: index('invoices_cust_idx').on(t.customerId),
}));

/* ----------------------------- PAYMENTS ----------------------------- */

export const payments = pgTable('payments', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  method: text('method'), // ach, card, wire, cash, check
  reference: text('reference'),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
  externalId: text('external_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  orgIdx: index('payments_org_idx').on(t.orgId),
  invIdx: index('payments_inv_idx').on(t.invoiceId),
}));

/* ----------------------------- INTEGRATIONS ----------------------------- */

export const integrations = pgTable('integrations', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  provider: integrationProvider('provider').notNull(),
  status: integrationStatus('status').notNull().default('pending'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  realmId: text('realm_id'), // QBO company id
  tenantId: text('tenant_id'), // Xero org id
  metadata: jsonb('metadata'),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pairIdx: uniqueIndex('integrations_pair_idx').on(t.orgId, t.provider),
}));

/* ----------------------------- DUNNING ----------------------------- */

export const dunningSequences = pgTable('dunning_sequences', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('Default'),
  isActive: boolean('is_active').notNull().default(true),
  steps: jsonb('steps').$type<Array<{
    id: string;
    daysFromDue: number;
    // 'phone' is a call task for the owner: nothing is sent to the customer.
    channel: 'email' | 'sms' | 'phone';
    tone: 'friendly' | 'firm' | 'final';
    subject?: string;
    template: string;
    // "Send as": a different display name, and on a verified own domain a
    // different local part, for this step. See src/lib/dunning/step-sender.ts.
    senderName?: string;
    senderLocalPart?: string;
  }>>().notNull(),
  pauseOnReply: boolean('pause_on_reply').notNull().default(true),
  pauseOnPayment: boolean('pause_on_payment').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // Matches dunning_sequences_org_id_idx added in drizzle/0003 (raw SQL).
  // Declared here so drizzle-kit's schema diff doesn't drift from the DB.
  orgIdx: index('dunning_sequences_org_id_idx').on(t.orgId),
}));

export const dunningRuns = pgTable('dunning_runs', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  sequenceId: text('sequence_id').notNull().references(() => dunningSequences.id, { onDelete: 'cascade' }),
  stepId: text('step_id').notNull(),
  channel: dunningChannel('channel').notNull(),
  status: dunningStatus('status').notNull().default('scheduled'),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  subject: text('subject'),
  body: text('body').notNull(),
  error: text('error'),
  // Resend's *email* Message-ID header (NOT the `id` Resend returns from
  // the send call — those are different values; confirmed live: send
  // returns a Resend UUID, this is the RFC822 id like
  // "<...@email.amazonses.com>"). Captured via a follow-up GET /emails/{id}
  // call right after sending. Used to match a customer's reply back to
  // this run via the reply's In-Reply-To/References headers — see
  // src/lib/inbox-imap-poll.ts.
  externalMessageId: text('external_message_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  schedIdx: index('dunning_sched_idx').on(t.status, t.scheduledFor),
  invIdx: index('dunning_inv_idx').on(t.invoiceId),
  // The following three match indexes added in drizzle/0003 (raw SQL) —
  // declared here so drizzle-kit's schema diff doesn't drift from the DB.
  orgIdx: index('dunning_runs_org_id_idx').on(t.orgId),
  seqIdx: index('dunning_runs_sequence_id_idx').on(t.sequenceId),
  invoiceSeqStepUniq: uniqueIndex('dunning_runs_invoice_seq_step_uniq').on(t.invoiceId, t.sequenceId, t.stepId),
  externalMsgIdx: index('dunning_runs_external_msg_idx').on(t.externalMessageId),
}));

/* ----------------------------- SUBSCRIPTIONS / BILLING ----------------------------- */

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  plan: planTier('plan').notNull().default('starter'),
  status: subStatus('status').notNull().default('trialing'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAt: timestamp('cancel_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  orgIdx: uniqueIndex('subs_org_idx').on(t.orgId),
}));

/* ----------------------------- UPGRADE REQUESTS (no-Stripe path) ----------------------------- */
// Captures "user wants to upgrade to X plan" when we can't take payment online.
// Davie reviews these manually and invoices via bank transfer / Wise / PayPal.
// Replaced by Stripe checkout when Stripe Atlas is set up.

export const upgradeRequests = pgTable('upgrade_requests', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  plan: planTier('plan').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerName: text('customer_name'),
  businessName: text('business_name'),
  country: text('country'),        // ISO 2-letter; helps Davie decide on payment method
  notes: text('notes'),            // free-form: customer's preferred payment, timeline, etc.
  status: text('status').notNull().default('pending'),  // pending | invoiced | paid | cancelled
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  orgIdx: index('upgrade_req_org_idx').on(t.orgId),
  statusIdx: index('upgrade_req_status_idx').on(t.status),
}));

/* ----------------------------- AUDIT / EVENTS ----------------------------- */

export const events = pgTable('events', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  payload: jsonb('payload'),
  actorId: text('actor_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  orgTypeIdx: index('events_org_type_idx').on(t.orgId, t.type),
}));

// Captures crashes caught by src/app/error.tsx and src/app/global-error.tsx
// (see reportClientError in src/lib/report-client-error.ts). Vercel's
// runtime log tail is short-lived on Hobby — a real error can age out of
// `vercel logs` in under an hour, taking its digest and stack trace with
// it. This table is the durable copy. orgId is nullable because a crash
// can happen before auth resolves (root layout, marketing pages).
export const clientErrors = pgTable('client_errors', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').references(() => organizations.id, { onDelete: 'set null' }),
  userId: text('user_id'),
  digest: text('digest'),
  message: text('message').notNull(),
  stack: text('stack'),
  path: text('path'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  createdAtIdx: index('client_errors_created_at_idx').on(t.createdAt),
}));

// Durable record that an org was deleted — deliberately NOT a foreign key
// to organizations.id (every other child table's FK is ON DELETE CASCADE,
// which was the bug: the account.deleted `events` row written specifically
// to leave "at minimum the deletion intent visible in logs" was itself
// cascade-deleted one statement later by the same operation it was meant
// to record, leaving zero durable evidence an org was ever deleted, by
// whom, or why — only an ephemeral console.warn. See cascadeDeleteOrgData
// in src/lib/account-deletion.ts.
export const deletedOrgsLog = pgTable('deleted_orgs_log', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull(),
  orgName: text('org_name').notNull(),
  reason: text('reason'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }).notNull().defaultNow(),
});

// Cursor for the IMAP inbox poller (src/lib/inbox-imap-poll.ts). Not
// org-scoped — one shared Zoho mailbox is polled for the whole
// deployment, so this just tracks "highest UID processed" per mailbox to
// avoid re-fetching/re-classifying the same message on every poll and to
// avoid ever bulk-processing the mailbox's pre-existing history.
export const inboxPollState = pgTable('inbox_poll_state', {
  mailbox: text('mailbox').primaryKey(),
  lastUid: integer('last_uid').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ----------------------------- WAITLIST (marketing) ----------------------------- */

export const waitlist = pgTable('waitlist', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  email: text('email').notNull().unique(),
  name: text('name'),
  company: text('company'),
  country: varchar('country', { length: 2 }),
  teamSize: text('team_size'),
  painPoint: text('pain_point'),
  source: text('source'),
  referrer: text('referrer'),
  // When set, this email is unsubscribed from marketing email (waitlist
  // campaigns, product updates). Set via /api/unsubscribe.
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  unsubscribeToken: text('unsubscribe_token'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Every address that has asked not to be emailed, whatever list it was on.
 *
 * This exists because /api/unsubscribe used to do only
 * `UPDATE waitlist SET unsubscribed_at ... WHERE email = $1`. A cold outreach
 * recipient is not on the waitlist, so that statement matched zero rows -- and
 * the endpoint returned "Unsubscribed" regardless. Every person who clicked
 * unsubscribe in an outreach email was told they had been removed and was
 * recorded nowhere.
 *
 * Unlike waitlist, a row here is created on demand for any address at all, so
 * an opt-out from someone we have no other record of still lands somewhere
 * durable. `outreach/scripts/sync_suppressions.py` pulls this into
 * outreach/data/suppression.csv, which is what the send scripts actually read.
 */
export const emailSuppressions = pgTable('email_suppressions', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  email: text('email').notNull().unique(),
  reason: text('reason').notNull().default('unsubscribe'),
  // Where the opt-out came from: 'unsubscribe_link', 'reply', 'bounce', 'manual'.
  source: text('source'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Append-only audit of every SMS consent interaction.
 *
 * Twilio's toll-free verification asks for proof of consent, and "the customer
 * row says opted_in" is an assertion, not proof. This records what was sent,
 * what came back, and when -- so the thread can be reconstructed from our own
 * data rather than from a screenshot.
 *
 * Keyed on the phone number as well as the customer, because a STOP can arrive
 * from a number we have not matched to a customer row and must still be
 * honoured.
 */
export const smsConsentEvents = pgTable('sms_consent_events', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  // Kept even when customerId is null: an unmatched STOP still binds us.
  phone: text('phone').notNull(),
  eventType: smsConsentEventType('event_type').notNull(),
  // The exact text we sent, or the exact body they replied with. Verbatim on
  // purpose -- a paraphrase is not evidence.
  messageText: text('message_text'),
  twilioSid: text('twilio_sid'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  phoneIdx: index('sms_consent_events_phone_idx').on(t.phone),
  customerIdx: index('sms_consent_events_customer_idx').on(t.customerId),
  createdAtIdx: index('sms_consent_events_created_at_idx').on(t.createdAt),
}));

/* ----------------------------- RELATIONS ----------------------------- */

export const orgRelations = relations(organizations, ({ many, one }) => ({
  memberships: many(memberships),
  customers: many(customers),
  invoices: many(invoices),
  integrations: many(integrations),
  sequences: many(dunningSequences),
  subscription: one(subscriptions, { fields: [organizations.id], references: [subscriptions.orgId] }),
  owner: one(users, { fields: [organizations.ownerId], references: [users.id] }),
}));

export const customerRelations = relations(customers, ({ many, one }) => ({
  invoices: many(invoices),
  payments: many(payments),
  org: one(organizations, { fields: [customers.orgId], references: [organizations.id] }),
}));

export const invoiceRelations = relations(invoices, ({ many, one }) => ({
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  payments: many(payments),
  runs: many(dunningRuns),
  org: one(organizations, { fields: [invoices.orgId], references: [organizations.id] }),
}));

/* ----------------------------- TYPES ----------------------------- */

export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type DunningSequence = typeof dunningSequences.$inferSelect;
export type DunningRun = typeof dunningRuns.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type UpgradeRequest = typeof upgradeRequests.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Waitlist = typeof waitlist.$inferSelect;

export type PlanTier = (typeof planTier.enumValues)[number];


/* ----------------------------- RELATIONSHIP TRACKING ----------------------------- */
// timelineEvents / promisesToPay / disputes back the customer detail page's
// activity timeline, promise-to-pay tracking, and dispute tracking (see
// src/app/api/{timeline,promises,disputes} for the write paths). Column
// shapes match the live Postgres columns (verified via information_schema
// 2026-07-31). inboxMessages / customerPreferences / qboRequestErrors below
// are declared but only qboRequestErrors currently has a write path
// (src/lib/qbo-error-logger.ts).

export const timelineEvents = pgTable('timeline_events', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
  actorId: text('actor_id'),
  eventType: text('event_type').notNull().default('note'),
  title: text('title'),
  description: text('description'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
});

export const promisesToPay = pgTable('promises_to_pay', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  promisedDate: timestamp('promised_date', { withTimezone: true }),
  promisedAmount: decimal('promised_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  currency: varchar('currency', { length: 3 }).default('USD'),
  status: text('status').notNull().default('active'),
  sourceText: text('source_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Owner-set pause on automatic reminders for one customer. Separate from
 * customers.dnd_at, which is the compliance switch (unsubscribe, hard bounce,
 * spam complaint) and must never be clearable from the app. See
 * src/lib/dunning/hold.ts. A separate table, not a customers column: adding a
 * column would make every select-all on customers fail until the DDL had run.
 */
export const dunningHolds = pgTable('dunning_holds', {
  customerId: text('customer_id').primaryKey().references(() => customers.id, { onDelete: 'cascade' }),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  heldUntil: timestamp('held_until', { withTimezone: true }), // null = until the owner resumes
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Per-org switches for automatic reminders. A missing row means approval is required. */
export const dunningSettings = pgTable('dunning_settings', {
  orgId: text('org_id').primaryKey().references(() => organizations.id, { onDelete: 'cascade' }),
  approvalRequired: boolean('approval_required').notNull().default(true),
  // Send window: only act during the owner's business hours. See
  // src/lib/dunning/send-window.ts. Off by default. send_days is a bitmask
  // (Mon = 1 ... Sun = 64); a null timezone falls back to organizations.timezone.
  sendWindowEnabled: boolean('send_window_enabled').notNull().default(false),
  sendWindowStart: smallint('send_window_start').notNull().default(9),
  sendWindowEnd: smallint('send_window_end').notNull().default(17),
  sendDays: smallint('send_days').notNull().default(31),
  sendTimezone: text('send_timezone'),
  // Chasing rules, see src/lib/dunning/chase-rules.ts. A gap of 0 or a minimum of 0 turns the rule off.
  minGapDays: smallint('min_gap_days').notNull().default(7),
  minBalance: decimal('min_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  // A reminder also lists the customer's other overdue invoices. See src/lib/dunning/multi-invoice.ts.
  listOtherInvoices: boolean('list_other_invoices').notNull().default(true),
  // Payment details or terms printed at the bottom of every statement (bank account, how to pay).
  statementFooter: text('statement_footer'),
  // Monthly statement drafts, which always wait for approval. See src/lib/statement-schedule.ts.
  statementsEnabled: boolean('statements_enabled').notNull().default(false),
  statementsDay: smallint('statements_day').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A customer's own sending domain. One per org, and each domain belongs to one
 * org. The mail provider issues the DNS records and reports when they verify;
 * reminders are sent from this domain only once status is 'verified'.
 */
export const dunningSenderDomains = pgTable('dunning_sender_domains', {
  orgId: text('org_id').primaryKey().references(() => organizations.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull().unique(),
  localPart: text('local_part').notNull().default('billing'),
  providerDomainId: text('provider_domain_id').notNull(),
  status: text('status').notNull().default('pending'),
  records: jsonb('records').$type<Array<{ kind: string; type: string; name: string; value: string; ttl: string; priority: number | null; status: string }>>().notNull().default([]),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Reminders the scheduler drafted but did not send, because the org requires
 * approval. The run itself stays in dunning_runs with status 'scheduled'; this
 * row is what marks it as waiting for a person. Approving or skipping deletes
 * it, atomically, so two clicks can never send twice.
 */
export const dunningApprovals = pgTable('dunning_approvals', {
  runId: text('run_id').primaryKey().references(() => dunningRuns.id, { onDelete: 'cascade' }),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Customer groups, each optionally carrying its own reminder schedule. A group's
 * schedule is an ordinary dunning_sequences row linked through group_sequences,
 * so nothing about sequences changed. A customer is in at most one group; a
 * customer in no group (or in a group without an active schedule) follows the
 * organisation's default schedule. Membership is its own table, not a column on
 * customers, for the same reason as dunning_holds.
 */
export const customerGroups = pgTable('customer_groups', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ orgNameUniq: uniqueIndex('customer_groups_org_name_uniq').on(t.orgId, t.name) }));

export const customerGroupMembers = pgTable('customer_group_members', {
  customerId: text('customer_id').primaryKey().references(() => customers.id, { onDelete: 'cascade' }),
  groupId: text('group_id').notNull().references(() => customerGroups.id, { onDelete: 'cascade' }),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
}, (t) => ({ groupIdx: index('customer_group_members_group_idx').on(t.groupId) }));

export const groupSequences = pgTable('group_sequences', {
  groupId: text('group_id').primaryKey().references(() => customerGroups.id, { onDelete: 'cascade' }),
  sequenceId: text('sequence_id').notNull().references(() => dunningSequences.id, { onDelete: 'cascade' }),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
});

/**
 * Who a call task is assigned to. A task is a dunning_runs row on the phone
 * channel; assignment is its own table, not a column, for the same reason as
 * dunning_approvals. The name is copied at assign time so the Tasks list does
 * not need a lookup against the sign-in provider to draw a label.
 */
export const taskAssignments = pgTable('task_assignments', {
  runId: text('run_id').primaryKey().references(() => dunningRuns.id, { onDelete: 'cascade' }),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  assigneeId: text('assignee_id').notNull(),
  assigneeName: text('assignee_name').notNull(),
  assignedBy: text('assigned_by'),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ assigneeIdx: index('task_assignments_assignee_idx').on(t.orgId, t.assigneeId) }));

/** What the organisation has written back to a customer from the Inbox. Inbound messages stay in inbox_messages. */
export const inboxReplies = pgTable('inbox_replies', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  messageId: text('message_id').notNull().references(() => inboxMessages.id, { onDelete: 'cascade' }),
  toAddress: text('to_address').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  sentBy: text('sent_by'),
  externalId: text('external_id'),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ messageIdx: index('inbox_replies_message_idx').on(t.messageId) }));

/**
 * A statement emailed to a customer. The statement itself is rebuilt from the
 * invoices every time, so this keeps only what was true when it went: who, when,
 * and the totals per currency.
 */
export const statementLog = pgTable('statement_log', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  toAddress: text('to_address').notNull(),
  subject: text('subject').notNull(),
  totals: jsonb('totals').$type<Array<{ currency: string; totalCents: number; overdueCents: number }>>().notNull(),
  sentBy: text('sent_by'),
  externalId: text('external_id'),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ customerIdx: index('statement_log_customer_idx').on(t.orgId, t.customerId) }));

/**
 * The organisation's late fee policy. One row per org; no row means off. See
 * src/lib/late-fees.ts for what each field means.
 */
export const lateFeePolicy = pgTable('late_fee_policy', {
  orgId: text('org_id').primaryKey().references(() => organizations.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  kind: text('kind').notNull().default('percent'),
  value: decimal('value', { precision: 14, scale: 2 }).notNull().default('0'),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  graceDays: smallint('grace_days').notNull().default(14),
  repeatMonthly: boolean('repeat_monthly').notNull().default(false),
  capPercent: decimal('cap_percent', { precision: 5, scale: 2 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A late fee the owner decided on. The ledger is separate from invoices on
 * purpose: it never changes an invoice's amount. One row per invoice and period,
 * so applying the same fee twice is impossible. 'applied' is owed, 'paid' has
 * been settled outside this app, 'waived' was decided against.
 */
export const lateFees = pgTable('late_fees', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  period: smallint('period').notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  status: text('status').notNull(),
  decidedBy: text('decided_by'),
  decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (t) => ({
  invoicePeriodUniq: uniqueIndex('late_fees_invoice_period_uniq').on(t.invoiceId, t.period),
  orgIdx: index('late_fees_org_idx').on(t.orgId, t.status),
}));

/**
 * Extra people who also receive a customer's reminders and statements, each as
 * their own email with their own unsubscribe. The customer's main email stays on
 * customers.email. See src/lib/recipients.ts.
 */
export const customerRecipients = pgTable('customer_recipients', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  name: text('name'),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  customerEmailUniq: uniqueIndex('customer_recipients_customer_email_uniq').on(t.customerId, t.email),
  emailIdx: index('customer_recipients_email_idx').on(t.email),
}));

/**
 * The provider message id of each copy of a reminder, so a reply from a copied
 * person is matched back to the reminder (and pauses it) like a reply from the
 * main contact. See src/lib/inbox-imap-poll.ts.
 */
export const reminderCopies = pgTable('reminder_copies', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  runId: text('run_id').notNull().references(() => dunningRuns.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  externalMessageId: text('external_message_id'),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ msgIdx: index('reminder_copies_msg_idx').on(t.externalMessageId), runIdx: index('reminder_copies_run_idx').on(t.runId) }));

/**
 * What happened on a call, written when a call task is closed. See
 * src/lib/dunning/call-outcome.ts. Its own table, like task_assignments.
 */
export const taskOutcomes = pgTable('task_outcomes', {
  runId: text('run_id').primaryKey().references(() => dunningRuns.id, { onDelete: 'cascade' }),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  outcome: text('outcome'),
  note: text('note'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A monthly statement the scheduler drafted and is holding for the owner. Nothing
 * is emailed until a person approves it. One per customer per month (unique), so
 * running the scheduler twice cannot draft twice.
 */
export const statementDrafts = pgTable('statement_drafts', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  period: text('period').notNull(),
  status: text('status').notNull().default('pending'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
}, (t) => ({
  customerPeriodUniq: uniqueIndex('statement_drafts_customer_period_uniq').on(t.customerId, t.period),
  orgStatusIdx: index('statement_drafts_org_status_idx').on(t.orgId, t.status),
}));

/** Named filters on list pages, shared by the organisation. See src/lib/saved-views.ts. */
export const savedViews = pgTable('saved_views', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  page: text('page').notNull(),
  name: text('name').notNull(),
  query: text('query').notNull().default(''),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ orgPageNameUniq: uniqueIndex('saved_views_org_page_name_uniq').on(t.orgId, t.page, t.name) }));

export const disputes = pgTable('disputes', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull().default('other'),
  status: text('status').notNull().default('open'),
  customerMessage: text('customer_message'),
  internalNotes: text('internal_notes'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Backs the "AI Collections Inbox" — every inbound reply from an AR
// customer (not to be confused with outreach_contacts/outreach_replies,
// which are cold-outreach prospect replies handled separately in
// src/lib/outreach-inbound.ts). Populated by POST /api/webhooks/inbox.
export const inboxMessages = pgTable('inbox_messages', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  channel: varchar('channel', { length: 16 }).notNull().default('email'),
  fromAddress: text('from_address'),
  fromName: text('from_name'),
  subject: text('subject'),
  body: text('body').notNull(),
  rawPayload: jsonb('raw_payload'),
  // Live Postgres enum `reply_classification`; kept as text() here (same
  // convention as disputes.reason / promisesToPay.status) so a mismatched
  // literal fails loudly instead of drifting silently — see the values in
  // REPLY_CLASSIFICATIONS in src/lib/ai/inbox.ts.
  classification: text('classification').notNull().default('unclassified'),
  classificationConfidence: decimal('classification_confidence', { precision: 4, scale: 3 }),
  aiSummary: text('ai_summary'),
  aiRecommendedAction: text('ai_recommended_action'),
  aiSuggestedPromiseDate: timestamp('ai_suggested_promise_date', { withTimezone: true }),
  status: text('status').notNull().default('new'),
  actionTaken: text('action_taken'),
  actionTakenAt: timestamp('action_taken_at', { withTimezone: true }),
  actionTakenBy: text('action_taken_by').references(() => users.id),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const customerPreferences = pgTable('customer_preferences', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }).unique(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
});

export const qboRequestErrors = pgTable('qbo_request_errors', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  status: integer('status').notNull(),
  intuitTid: text('intuit_tid'),
  intuitErrorCode: text('intuit_error_code'),
  intuitErrorMessage: text('intuit_error_message'),
  faultType: text('fault_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
