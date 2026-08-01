import {
  pgTable, text, varchar, timestamp, integer, boolean, decimal, jsonb, index, uniqueIndex, pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';

/* ----------------------------- ENUMS ----------------------------- */

export const userRole = pgEnum('user_role', ['owner', 'admin', 'member', 'viewer']);
export const integrationStatus = pgEnum('integration_status', ['connected', 'disconnected', 'error', 'pending']);
export const integrationProvider = pgEnum('integration_provider', ['quickbooks', 'xero', 'stripe', 'square', 'plaid']);
export const invoiceStatus = pgEnum('invoice_status', ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'disputed', 'written_off']);
export const dunningChannel = pgEnum('dunning_channel', ['email', 'sms', 'phone', 'letter']);
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
    channel: 'email' | 'sms';
    tone: 'friendly' | 'firm' | 'final';
    subject?: string;
    template: string;
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  schedIdx: index('dunning_sched_idx').on(t.status, t.scheduledFor),
  invIdx: index('dunning_inv_idx').on(t.invoiceId),
  // The following three match indexes added in drizzle/0003 (raw SQL) —
  // declared here so drizzle-kit's schema diff doesn't drift from the DB.
  orgIdx: index('dunning_runs_org_id_idx').on(t.orgId),
  seqIdx: index('dunning_runs_sequence_id_idx').on(t.sequenceId),
  invoiceSeqStepUniq: uniqueIndex('dunning_runs_invoice_seq_step_uniq').on(t.invoiceId, t.sequenceId, t.stepId),
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


/* ----------------------------- SCHEMA STUBS (build-only) ----------------------------- */
// Minimal Drizzle declarations for tables that exist in the live DB but
// were not yet committed to schema.ts. The full schema for these tables
// lives in the dirty tree. For the immediate build/unblock we declare
// only the columns that tracked source code references:
//
//   src/app/dashboard/customers/[id]/page.tsx uses:
//     timelineEvents.{customerId, occurredAt}
//     promisesToPay.{customerId, createdAt, status, promisedAmount,
//                     promisedDate, sourceText}
//     disputes.{customerId, createdAt, status, reason, customerMessage,
//               internalNotes, id, resolvedAt}
//   src/lib/billing.ts uses:   disputes (imported, no field access)
//   other tracked files:       various (each checked individually)
//
// SAFE: the column shapes match the live Postgres columns exactly
// (verified via information_schema queries 2026-07-31). Drizzle type
// inference aligns with DB rows. No migration is needed.
//
// TODO(before dirty merge): replace these stubs with the full
// declarations from the dirty src/db/schema.ts additions.

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
});

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
});

export const inboxMessages = pgTable('inbox_messages', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
});

export const customerPreferences = pgTable('customer_preferences', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }).unique(),
  orgId: text('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
});

export const qboRequestErrors = pgTable('qbo_request_errors', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
});
