/**
 * Bootstrap the in-memory PGlite database with schema + seed on first use.
 * Only runs in PGlite mode (dev).
 */
import { client } from '@/db/pglite';
import { nanoid } from '@/lib/utils';

const DDL = `
CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, clerk_id text NOT NULL UNIQUE, email text NOT NULL UNIQUE, name text, avatar_url text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS organizations (id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE, base_currency varchar(3) NOT NULL DEFAULT 'USD', country varchar(2) NOT NULL DEFAULT 'US', timezone text NOT NULL DEFAULT 'UTC', business_type text, owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, plan text NOT NULL DEFAULT 'starter', trial_ends_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS memberships (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, role text NOT NULL DEFAULT 'owner', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS customers (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, external_id text, name text NOT NULL, email text, phone text, company text, preferred_channel text NOT NULL DEFAULT 'email', payment_behavior jsonb, notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS invoices (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE, external_id text, number text NOT NULL, status text NOT NULL DEFAULT 'draft', amount decimal(14,2) NOT NULL, amount_paid decimal(14,2) NOT NULL DEFAULT 0, currency varchar(3) NOT NULL DEFAULT 'USD', issue_date timestamptz NOT NULL, due_date timestamptz NOT NULL, paid_at timestamptz, description text, line_items jsonb, payment_link text, last_reminder_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS payments (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE, amount decimal(14,2) NOT NULL, currency varchar(3) NOT NULL DEFAULT 'USD', method text, reference text, paid_at timestamptz NOT NULL, external_id text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS integrations (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, provider text NOT NULL, status text NOT NULL DEFAULT 'pending', access_token text, refresh_token text, expires_at timestamptz, realm_id text, tenant_id text, metadata jsonb, last_sync_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS dunning_sequences (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, name text NOT NULL DEFAULT 'Default', is_active boolean NOT NULL DEFAULT true, steps jsonb NOT NULL, pause_on_reply boolean NOT NULL DEFAULT true, pause_on_payment boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS dunning_runs (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, sequence_id text NOT NULL REFERENCES dunning_sequences(id) ON DELETE CASCADE, step_id text NOT NULL, channel text NOT NULL, status text NOT NULL DEFAULT 'scheduled', scheduled_for timestamptz NOT NULL, sent_at timestamptz, subject text, body text NOT NULL, error text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS subscriptions (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, stripe_customer_id text, stripe_subscription_id text, plan text NOT NULL DEFAULT 'starter', status text NOT NULL DEFAULT 'trialing', current_period_start timestamptz, current_period_end timestamptz, cancel_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS events (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, type text NOT NULL, payload jsonb, actor_id text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS waitlist (id text PRIMARY KEY, email text NOT NULL UNIQUE, name text, company text, country varchar(2), team_size text, pain_point text, source text, referrer text, created_at timestamptz NOT NULL DEFAULT now());
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

let bootstrapped = false;

export async function ensureBootstrapped() {
  if (bootstrapped) return;
  if (process.env.USE_PGLITE !== '1') { bootstrapped = true; return; }
  try {
    await client.exec(DDL);
    await seedIfEmpty(client);
  } catch (e) {
    console.error('Bootstrap error:', e);
  }
  bootstrapped = true;
}

async function seedIfEmpty(client: any) {
  // Skip auto-seed if SKIP_BOOTSTRAP_SEED=1 (for testing the empty state)
  if (process.env.SKIP_BOOTSTRAP_SEED === '1') return;
  const r: { rows: { count: string }[] } = await client.query('SELECT count(*) as count FROM organizations');
  if (Number(r.rows[0]?.count ?? 0) > 0) return;
  const userId = 'user_dev_davie';
  const orgId = 'org_demo_collectly';
  const now = new Date().toISOString();
  await client.exec(`INSERT INTO users (id, clerk_id, email, name, created_at, updated_at) VALUES ('${userId}', '${userId}', 'davie@getcollectly.app', 'Davie', '${now}', '${now}')`);
  await client.exec(`INSERT INTO organizations (id, name, slug, base_currency, country, timezone, business_type, owner_id, plan, trial_ends_at, created_at, updated_at) VALUES ('${orgId}', 'Lumen & Co', 'lumen-co', 'USD', 'US', 'America/New_York', 'Design agency', '${userId}', 'growth', '${new Date(Date.now() + 13 * 86400000).toISOString()}', '${now}', '${now}')`);
  await client.exec(`INSERT INTO memberships (id, user_id, org_id, role, created_at) VALUES ('${nanoid()}', '${userId}', '${orgId}', 'owner', '${now}')`);
  await client.exec(`INSERT INTO integrations (id, org_id, provider, status, realm_id, last_sync_at, created_at, updated_at) VALUES ('${nanoid()}', '${orgId}', 'quickbooks', 'connected', 'demo-realm-1', '${now}', '${now}', '${now}')`);
  const customers = [
    { name: 'Brightline Legal', email: 'ap@brightlinelegal.com', phone: '+14155551234', company: 'Brightline Legal LLP', channel: 'email', avgDays: 28, paidRate: 0.95, risk: 15 },
    { name: 'Harbor Painting Co', email: 'bills@harborpainting.com', phone: '+14155555678', company: 'Harbor Painting', channel: 'sms', avgDays: 14, paidRate: 0.99, risk: 8 },
    { name: 'Westgate Advisory', email: 'finance@westgate.com', phone: '+12125559001', company: 'Westgate Advisory', channel: 'email', avgDays: 47, paidRate: 0.78, risk: 62 },
    { name: 'Northstar Marketing', email: 'ap@northstar.io', phone: '+12125559002', company: 'Northstar Marketing', channel: 'email', avgDays: 65, paidRate: 0.55, risk: 78 },
    { name: 'Acme Studios', email: 'bills@acmestudios.com', phone: '+13105559003', company: 'Acme Studios', channel: 'email', avgDays: 95, paidRate: 0.32, risk: 88 },
    { name: 'Riverstone Co.', email: 'hello@riverstone.co', phone: '+447700900123', company: 'Riverstone Co', channel: 'email', avgDays: 21, paidRate: 0.92, risk: 22 },
  ];
  const custMap = new Map<string, string>();
  for (const c of customers) {
    const cid = nanoid();
    const behavior = JSON.stringify({
      avgDaysToPay: c.avgDays,
      paidRate: c.paidRate,
      lastPaidAt: new Date(Date.now() - c.avgDays * 86400000 / 2 * 1000).toISOString(),
      riskScore: c.risk,
    }).replace(/'/g, "''");
    await client.exec(`INSERT INTO customers (id, org_id, name, email, phone, company, preferred_channel, payment_behavior, created_at, updated_at) VALUES ('${cid}', '${orgId}', '${c.name.replace(/'/g, "''")}', '${c.email}', '${c.phone}', '${c.company.replace(/'/g, "''")}', '${c.channel}', '${behavior}'::jsonb, '${now}', '${now}')`);
    custMap.set(c.name, cid);
  }
  const invoices = [
    { cust: 'Brightline Legal', number: 'INV-2401', amount: '24500.00', daysAgo: 4 },
    { cust: 'Harbor Painting Co', number: 'INV-2402', amount: '8200.00', daysAgo: 12 },
    { cust: 'Westgate Advisory', number: 'INV-2390', amount: '42000.00', daysAgo: 38 },
    { cust: 'Northstar Marketing', number: 'INV-2380', amount: '15750.00', daysAgo: 67 },
    { cust: 'Acme Studios', number: 'INV-2370', amount: '93800.00', daysAgo: 95 },
    { cust: 'Riverstone Co.', number: 'INV-2405', amount: '6300.00', daysAgo: -3 },
    { cust: 'Brightline Legal', number: 'INV-2410', amount: '12500.00', daysAgo: -10 },
    { cust: 'Westgate Advisory', number: 'INV-2412', amount: '8800.00', daysAgo: -2 },
  ];
  for (const i of invoices) {
    const cid = custMap.get(i.cust);
    if (!cid) continue;
    const issue = new Date(Date.now() - i.daysAgo * 86400000).toISOString();
    const due = new Date(new Date(issue).getTime() + 30 * 86400000).toISOString();
    const status = i.daysAgo > 0 ? 'overdue' : 'sent';
    await client.exec(`INSERT INTO invoices (id, org_id, customer_id, number, status, amount, amount_paid, currency, issue_date, due_date, description, created_at, updated_at) VALUES ('${nanoid()}', '${orgId}', '${cid}', '${i.number}', '${status}', ${i.amount}, 0, 'USD', '${issue}', '${due}', 'Design services', '${now}', '${now}')`);
  }
  const cust = custMap.get('Brightline Legal')!;
  const paidIssue = new Date(Date.now() - 25 * 86400000).toISOString();
  const paidDue = new Date(Date.now() + 5 * 86400000).toISOString();
  const paidId = nanoid();
  await client.exec(`INSERT INTO invoices (id, org_id, customer_id, number, status, amount, amount_paid, currency, issue_date, due_date, paid_at, description, created_at, updated_at) VALUES ('${paidId}', '${orgId}', '${cust}', 'INV-2395', 'paid', 18000.00, 18000.00, 'USD', '${paidIssue}', '${paidDue}', '${new Date(Date.now() - 18 * 86400000).toISOString()}', 'Brand sprint — paid', '${now}', '${now}')`);
  await client.exec(`INSERT INTO payments (id, org_id, invoice_id, customer_id, amount, currency, method, paid_at, created_at) VALUES ('${nanoid()}', '${orgId}', '${paidId}', '${cust}', 18000.00, 'USD', 'ach', '${new Date(Date.now() - 18 * 86400000).toISOString()}', '${now}')`);
  const seqId = nanoid();
  const steps = JSON.stringify([
    { id: 's1', daysFromDue: 1, channel: 'email', tone: 'friendly', subject: 'Quick reminder — Invoice {{number}}', template: 'Hi {{contact_name}}, just a quick nudge that Invoice {{number}} for {{amount}} was due on {{due_date}}. You can settle it here: {{payment_link}}' },
    { id: 's2', daysFromDue: 7, channel: 'email', tone: 'firm', subject: 'Invoice {{number}} is now 7 days past due', template: 'Hi {{contact_name}}, Invoice {{number}} for {{amount}} is now 7 days past due. Please review and settle at your earliest convenience: {{payment_link}}' },
    { id: 's3', daysFromDue: 14, channel: 'email', tone: 'firm', subject: 'Action required: Invoice {{number}}', template: 'Hi {{contact_name}}, our records show Invoice {{number}} for {{amount}} is 14 days overdue. Please confirm payment status or settle the balance: {{payment_link}}' },
    { id: 's4', daysFromDue: 30, channel: 'sms', tone: 'final', template: 'Final notice: Invoice {{number}} for {{amount}} is 30+ days overdue. Please reply or settle: {{payment_link}}' },
  ]).replace(/'/g, "''");
  await client.exec(`INSERT INTO dunning_sequences (id, org_id, name, is_active, steps, pause_on_reply, pause_on_payment, created_at, updated_at) VALUES ('${seqId}', '${orgId}', 'Default', true, '${steps}'::jsonb, true, true, '${now}', '${now}')`);
  await client.exec(`INSERT INTO subscriptions (id, org_id, plan, status, current_period_start, current_period_end, created_at, updated_at) VALUES ('${nanoid()}', '${orgId}', 'growth', 'trialing', '${now}', '${new Date(Date.now() + 13 * 86400000).toISOString()}', '${now}', '${now}')`);
}
