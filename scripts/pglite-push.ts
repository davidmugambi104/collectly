/**
 * Apply DDL to PGlite.
 * Usage: USE_PGLITE=1 PGLITE_DIR=./.pglite npx tsx scripts/pglite-push.ts
 */
import { PGlite } from '@electric-sql/pglite';

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  clerk_id text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  base_currency varchar(3) NOT NULL DEFAULT 'USD',
  country varchar(2) NOT NULL DEFAULT 'US',
  timezone text NOT NULL DEFAULT 'UTC',
  business_type text,
  owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'starter',
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memberships (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS customers (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id text,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  preferred_channel text NOT NULL DEFAULT 'email',
  payment_behavior jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS invoices (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  external_id text,
  number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  amount decimal(14,2) NOT NULL,
  amount_paid decimal(14,2) NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  issue_date timestamptz NOT NULL,
  due_date timestamptz NOT NULL,
  paid_at timestamptz,
  description text,
  line_items jsonb,
  payment_link text,
  last_reminder_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount decimal(14,2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  method text,
  reference text,
  paid_at timestamptz NOT NULL,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS integrations (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  realm_id text,
  tenant_id text,
  metadata jsonb,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dunning_sequences (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default',
  is_active boolean NOT NULL DEFAULT true,
  steps jsonb NOT NULL,
  pause_on_reply boolean NOT NULL DEFAULT true,
  pause_on_payment boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dunning_runs (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sequence_id text NOT NULL REFERENCES dunning_sequences(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  subject text,
  body text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'starter',
  status text NOT NULL DEFAULT 'trialing',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb,
  actor_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS waitlist (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text,
  company text,
  country varchar(2),
  team_size text,
  pain_point text,
  source text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customers_org_idx ON customers(org_id);
CREATE INDEX IF NOT EXISTS invoices_org_idx ON invoices(org_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(org_id, status);
CREATE INDEX IF NOT EXISTS invoices_due_idx ON invoices(due_date);
CREATE INDEX IF NOT EXISTS invoices_cust_idx ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS payments_org_idx ON payments(org_id);
CREATE INDEX IF NOT EXISTS payments_inv_idx ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS dunning_sched_idx ON dunning_runs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS dunning_inv_idx ON dunning_runs(invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS subs_org_idx ON subscriptions(org_id);
`;

(async () => {
  const dataDir = process.env.PGLITE_DIR ?? './.pglite';
  const client = new PGlite(dataDir);
  await client.exec(DDL);
  await client.close();
  console.log('✅ Schema applied to PGlite at', dataDir);
})().catch((e) => { console.error(e); process.exit(1); });
