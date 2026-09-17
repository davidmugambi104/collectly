/**
 * Bootstrap the in-memory PGlite database with schema + seed on first use.
 * Only runs in PGlite mode (dev).
 */
import { client } from '@/db/pglite';
import type { PGlite } from '@electric-sql/pglite';
import { nanoid } from '@/lib/utils';

const DDL = `
CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, clerk_id text NOT NULL UNIQUE, email text NOT NULL UNIQUE, name text, avatar_url text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS organizations (id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE, base_currency varchar(3) NOT NULL DEFAULT 'USD', country varchar(2) NOT NULL DEFAULT 'US', timezone text NOT NULL DEFAULT 'UTC', business_type text, owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, plan text NOT NULL DEFAULT 'starter', trial_ends_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS memberships (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, role text NOT NULL DEFAULT 'owner', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS customers (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, external_id text, name text NOT NULL, email text, phone text, company text, preferred_channel text NOT NULL DEFAULT 'email', payment_behavior jsonb, notes text, dnd_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS invoices (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE, external_id text, number text NOT NULL, status text NOT NULL DEFAULT 'draft', amount decimal(14,2) NOT NULL, amount_paid decimal(14,2) NOT NULL DEFAULT 0, currency varchar(3) NOT NULL DEFAULT 'USD', issue_date timestamptz NOT NULL, due_date timestamptz NOT NULL, paid_at timestamptz, description text, line_items jsonb, payment_link text, last_reminder_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS payments (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE, amount decimal(14,2) NOT NULL, currency varchar(3) NOT NULL DEFAULT 'USD', method text, reference text, paid_at timestamptz NOT NULL, external_id text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS integrations (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, provider text NOT NULL, status text NOT NULL DEFAULT 'pending', access_token text, refresh_token text, expires_at timestamptz, realm_id text, tenant_id text, metadata jsonb, last_sync_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS dunning_sequences (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, name text NOT NULL DEFAULT 'Default', is_active boolean NOT NULL DEFAULT true, steps jsonb NOT NULL, pause_on_reply boolean NOT NULL DEFAULT true, pause_on_payment boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS dunning_runs (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, sequence_id text NOT NULL REFERENCES dunning_sequences(id) ON DELETE CASCADE, step_id text NOT NULL, channel text NOT NULL, status text NOT NULL DEFAULT 'scheduled', scheduled_for timestamptz NOT NULL, sent_at timestamptz, subject text, body text NOT NULL, error text, external_message_id text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS subscriptions (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, stripe_customer_id text, stripe_subscription_id text, plan text NOT NULL DEFAULT 'starter', status text NOT NULL DEFAULT 'trialing', current_period_start timestamptz, current_period_end timestamptz, cancel_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS upgrade_requests (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, plan text NOT NULL, customer_email text NOT NULL, customer_name text, business_name text, country text, notes text, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS customer_preferences (id text PRIMARY KEY, customer_id text NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS qbo_request_errors (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, endpoint text NOT NULL, method text NOT NULL, status integer NOT NULL, intuit_tid text, intuit_error_code text, intuit_error_message text, fault_type text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS events (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, type text NOT NULL, payload jsonb, actor_id text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS client_errors (id text PRIMARY KEY, org_id text REFERENCES organizations(id) ON DELETE SET NULL, user_id text, digest text, message text NOT NULL, stack text, path text, user_agent text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS webhook_events_seen (svix_id text PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS deleted_orgs_log (id text PRIMARY KEY, org_id text NOT NULL, org_name text NOT NULL, reason text, deleted_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS inbox_poll_state (mailbox text PRIMARY KEY, last_uid integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS waitlist (id text PRIMARY KEY, email text NOT NULL UNIQUE, name text, company text, country varchar(2), team_size text, pain_point text, source text, referrer text, unsubscribed_at timestamptz, unsubscribe_token text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS timeline_events (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, customer_id text REFERENCES customers(id) ON DELETE CASCADE, invoice_id text REFERENCES invoices(id) ON DELETE CASCADE, actor_id text, event_type text NOT NULL DEFAULT 'note', title text, description text, occurred_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS promises_to_pay (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE, promised_date timestamptz, promised_amount decimal(14,2) NOT NULL DEFAULT 0, currency varchar(3) DEFAULT 'USD', status text NOT NULL DEFAULT 'active', source_text text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS disputes (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, invoice_id text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE, reason text NOT NULL DEFAULT 'other', status text NOT NULL DEFAULT 'open', customer_message text, internal_notes text, resolved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS inbox_messages (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, customer_id text REFERENCES customers(id) ON DELETE SET NULL, invoice_id text REFERENCES invoices(id) ON DELETE SET NULL, channel varchar(16) NOT NULL DEFAULT 'email', from_address text, from_name text, subject text, body text NOT NULL, raw_payload jsonb, classification text NOT NULL DEFAULT 'unclassified', classification_confidence decimal(4,3), ai_summary text, ai_recommended_action text, ai_suggested_promise_date timestamptz, status text NOT NULL DEFAULT 'new', action_taken text, action_taken_at timestamptz, action_taken_by text REFERENCES users(id), received_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS upgrade_requests (id text PRIMARY KEY, org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, plan text NOT NULL DEFAULT 'starter', customer_email text NOT NULL, customer_name text, business_name text, country text, notes text, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS upgrade_req_org_idx ON upgrade_requests(org_id);
CREATE INDEX IF NOT EXISTS customers_org_idx ON customers(org_id);
CREATE INDEX IF NOT EXISTS invoices_org_idx ON invoices(org_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(org_id, status);
CREATE INDEX IF NOT EXISTS invoices_due_idx ON invoices(due_date);
CREATE INDEX IF NOT EXISTS invoices_cust_idx ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS payments_org_idx ON payments(org_id);
CREATE INDEX IF NOT EXISTS payments_inv_idx ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS dunning_sched_idx ON dunning_runs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS dunning_inv_idx ON dunning_runs(invoice_id);
CREATE INDEX IF NOT EXISTS dunning_runs_external_msg_idx ON dunning_runs(external_message_id);
CREATE UNIQUE INDEX IF NOT EXISTS dunning_runs_invoice_seq_step_uniq ON dunning_runs(invoice_id, sequence_id, step_id);
CREATE UNIQUE INDEX IF NOT EXISTS subs_org_idx ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS timeline_cust_idx ON timeline_events(customer_id);
CREATE INDEX IF NOT EXISTS promises_cust_idx ON promises_to_pay(customer_id);
CREATE INDEX IF NOT EXISTS disputes_cust_idx ON disputes(customer_id);
CREATE INDEX IF NOT EXISTS inbox_org_status_idx ON inbox_messages(org_id, status);
CREATE INDEX IF NOT EXISTS upgrade_req_org_idx ON upgrade_requests(org_id);
CREATE INDEX IF NOT EXISTS upgrade_req_status_idx ON upgrade_requests(status);
CREATE INDEX IF NOT EXISTS client_errors_created_at_idx ON client_errors(created_at);
`;

// Memoized as a *promise*, not a boolean. The previous boolean flag was only
// flipped after the awaited seed finished, so every request that arrived while
// the first seed was still in flight sailed past the guard and ran
// seedIfEmpty() too. Each racer read `SELECT count(*) FROM organizations` as 0
// (nobody had committed yet) and then raced to INSERT the same fixed-id rows;
// the losers died on `duplicate key value violates unique constraint
// "users_pkey"`. That error was swallowed by the catch, so a partially-seeded
// DB — organizations row present, customers/invoices missing — looked like a
// success and the dashboard rendered $0.00 across the board. A dashboard page
// alone fires six parallel queries, so this hit on essentially every cold
// start. Handing every caller the *same* promise makes the seed run once.
let bootstrapPromise: Promise<void> | null = null;

export function ensureBootstrapped(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      if (process.env.USE_PGLITE !== '1') return;
      try {
        await client.exec(DDL);
        await seedIfEmpty(client);
      } catch (e) {
        // Reset so a transient failure (rather than a genuinely-seeded DB)
        // can be retried by the next caller instead of being cached forever.
        bootstrapPromise = null;
        console.error('Bootstrap error:', e);
      }
    })();
  }
  return bootstrapPromise;
}

async function seedIfEmpty(client: PGlite) {
  // Skip auto-seed if SKIP_BOOTSTRAP_SEED=1 (for testing the empty state)
  if (process.env.SKIP_BOOTSTRAP_SEED === '1') return;
  const r: { rows: { count: string }[] } = await client.query('SELECT count(*) as count FROM organizations');
  if (Number(r.rows[0]?.count ?? 0) > 0) return;
  const userId = 'user_dev_davie';
  const orgId = 'org_demo_collectly';
  const now = new Date().toISOString();
  await client.exec(`INSERT INTO users (id, clerk_id, email, name, created_at, updated_at) VALUES ('${userId}', '${userId}', 'davie@getcollectly.app', 'Davie', '${now}', '${now}')`);
  // DEV SEED ONLY — these names (Lumen & Co, Brightline Legal, Northstar
  // Marketing, etc.) are ILLUSTRATIVE personas. Never let a screenshot of this
  // dev org appear on the marketing site or in sales collateral without a
  // clear "sample data" label. Real prospects with similar names will
  // recognize them and trust drops.
  await client.exec(`INSERT INTO organizations (id, name, slug, base_currency, country, timezone, business_type, owner_id, plan, trial_ends_at, created_at, updated_at) VALUES ('${orgId}', 'Lumen & Co', 'lumen-co', 'USD', 'US', 'America/New_York', 'Design agency', '${userId}', 'growth', '${new Date(Date.now() + 13 * 86400000).toISOString()}', '${now}', '${now}')`);
  await client.exec(`INSERT INTO memberships (id, user_id, org_id, role, created_at) VALUES ('${nanoid()}', '${userId}', '${orgId}', 'owner', '${now}')`);
  await client.exec(`INSERT INTO integrations (id, org_id, provider, status, realm_id, last_sync_at, created_at, updated_at) VALUES ('${nanoid()}', '${orgId}', 'quickbooks', 'connected', 'demo-realm-1', '${now}', '${now}', '${now}')`);
  const customers = [
    { name: 'Brightline Legal', email: 'ap@brightline.example', phone: '+14155551234', company: 'Brightline Legal LLP', channel: 'email', avgDays: 28, paidRate: 0.95, risk: 15 },
    { name: 'Harbor Painting Co', email: 'bills@harborpainting.example', phone: '+14155555678', company: 'Harbor Painting', channel: 'sms', avgDays: 14, paidRate: 0.99, risk: 8 },
    { name: 'Westgate Advisory', email: 'finance@westgate.example', phone: '+12125559001', company: 'Westgate Advisory', channel: 'email', avgDays: 47, paidRate: 0.78, risk: 62 },
    { name: 'Northstar Marketing', email: 'ap@northstar.example', phone: '+12125559002', company: 'Northstar Marketing', channel: 'email', avgDays: 65, paidRate: 0.55, risk: 78 },
    { name: 'Acme Studios', email: 'bills@acmestudio.example', phone: '+13105559003', company: 'Acme Studios', channel: 'email', avgDays: 95, paidRate: 0.32, risk: 88 },
    { name: 'Riverstone Co.', email: 'hello@riverstone.example', phone: '+447700900123', company: 'Riverstone Co', channel: 'email', avgDays: 21, paidRate: 0.92, risk: 22 },
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
  const invMap = new Map<string, string>();
  for (const i of invoices) {
    const cid = custMap.get(i.cust);
    if (!cid) continue;
    const issue = new Date(Date.now() - i.daysAgo * 86400000).toISOString();
    const due = new Date(new Date(issue).getTime() + 30 * 86400000).toISOString();
    // daysAgo is the ISSUE-date offset and terms are net-30, so an invoice is
    // only genuinely overdue once it was issued more than 30 days ago. Keying
    // off `daysAgo > 0` marked invoices issued 4 days ago — due 26 days from
    // now — as 'overdue', so the demo org rendered future due dates under a
    // red Overdue badge.
    const status = i.daysAgo > 30 ? 'overdue' : 'sent';
    const invId = nanoid();
    invMap.set(i.number, invId);
    await client.exec(`INSERT INTO invoices (id, org_id, customer_id, number, status, amount, amount_paid, currency, issue_date, due_date, description, created_at, updated_at) VALUES ('${invId}', '${orgId}', '${cid}', '${i.number}', '${status}', ${i.amount}, 0, 'USD', '${issue}', '${due}', 'Design services', '${now}', '${now}')`);
  }
  // Paid history. This used to be a single invoice paid `Date.now() - 18 days`,
  // which is a calendar bug rather than a data choice: for most of any month
  // that timestamp lands in the PREVIOUS month, so the demo org rendered
  // "Collected MTD $0.00", a red "-100% vs last month" delta, and a forecast
  // that apologised for needing 5+ paid invoices to calibrate. The headline
  // number on the overview page was therefore broken or healthy depending on
  // which day of the month you happened to look.
  //
  // Anchoring to the calendar instead of to an offset fixes that: three
  // payments are pinned inside the current month and three inside the
  // previous one, so month-to-date, the month-over-month delta and the DSO
  // sample are all meaningful on every day of every month. Six paid invoices
  // also clears the 5-invoice threshold the forecaster needs before it will
  // report anything better than low confidence.
  const nowD = new Date();
  const dayIn = (monthOffset: number, day: number) =>
    new Date(nowD.getFullYear(), nowD.getMonth() + monthOffset, day, 10, 0, 0);
  // Clamp to today so a payment is never dated into the future early in the month.
  const thisMonth = (day: number) => dayIn(0, Math.min(day, nowD.getDate()));
  const paidInvoices = [
    { cust: 'Brightline Legal',   number: 'INV-2395', amount: '18000.00', paidAt: dayIn(-1, 12), method: 'ach' },
    { cust: 'Westgate Advisory',  number: 'INV-2388', amount: '11200.00', paidAt: dayIn(-1, 19), method: 'card' },
    { cust: 'Riverstone Co.',     number: 'INV-2391', amount: '7400.00',  paidAt: dayIn(-1, 26), method: 'ach' },
    { cust: 'Harbor Painting Co', number: 'INV-2396', amount: '14600.00', paidAt: thisMonth(3),  method: 'ach' },
    { cust: 'Northstar Marketing',number: 'INV-2398', amount: '9250.00',  paidAt: thisMonth(9),  method: 'card' },
    { cust: 'Brightline Legal',   number: 'INV-2400', amount: '16800.00', paidAt: thisMonth(15), method: 'ach' },
  ];
  for (const pi of paidInvoices) {
    const pcid = custMap.get(pi.cust);
    // Throw rather than `continue`. A typo'd customer name here used to skip
    // the row silently, which does not fail anything — it just quietly removes
    // money from the demo org's month-to-date total, and the only symptom is a
    // headline figure that looks a bit low.
    if (!pcid) throw new Error(`seed: unknown customer ${pi.cust} for ${pi.number}`);
    const paidIso = pi.paidAt.toISOString();
    // Issued ~3 weeks before it was settled, on net-30 terms: paid early, which
    // is what a book with a 7-day DSO is supposed to look like.
    const pIssue = new Date(pi.paidAt.getTime() - 21 * 86400000).toISOString();
    const pDue = new Date(pi.paidAt.getTime() + 9 * 86400000).toISOString();
    const pid = nanoid();
    await client.exec(`INSERT INTO invoices (id, org_id, customer_id, number, status, amount, amount_paid, currency, issue_date, due_date, paid_at, description, created_at, updated_at) VALUES ('${pid}', '${orgId}', '${pcid}', '${pi.number}', 'paid', ${pi.amount}, ${pi.amount}, 'USD', '${pIssue}', '${pDue}', '${paidIso}', 'Design services', '${now}', '${now}')`);
    await client.exec(`INSERT INTO payments (id, org_id, invoice_id, customer_id, amount, currency, method, paid_at, created_at) VALUES ('${nanoid()}', '${orgId}', '${pid}', '${pcid}', ${pi.amount}, 'USD', '${pi.method}', '${paidIso}', '${now}')`);
  }
  const seqId = nanoid();
  const steps = JSON.stringify([
    { id: 's1', daysFromDue: 1, channel: 'email', tone: 'friendly', subject: 'Quick reminder — Invoice {{number}}', template: 'Hi {{contact_name}}, just a quick nudge that Invoice {{number}} for {{amount}} was due on {{due_date}}. You can settle it here: {{payment_link}}' },
    { id: 's2', daysFromDue: 7, channel: 'email', tone: 'firm', subject: 'Invoice {{number}} is now 7 days past due', template: 'Hi {{contact_name}}, Invoice {{number}} for {{amount}} is now 7 days past due. Please review and settle at your earliest convenience: {{payment_link}}' },
    { id: 's3', daysFromDue: 14, channel: 'email', tone: 'firm', subject: 'Action required: Invoice {{number}}', template: 'Hi {{contact_name}}, our records show Invoice {{number}} for {{amount}} is 14 days overdue. Please confirm payment status or settle the balance: {{payment_link}}' },
    { id: 's4', daysFromDue: 30, channel: 'sms', tone: 'final', template: 'Final notice: Invoice {{number}} for {{amount}} is 30+ days overdue. Please reply or settle: {{payment_link}}' },
  ]).replace(/'/g, "''");
  await client.exec(`INSERT INTO dunning_sequences (id, org_id, name, is_active, steps, pause_on_reply, pause_on_payment, created_at, updated_at) VALUES ('${seqId}', '${orgId}', 'Default', true, '${steps}'::jsonb, true, true, '${now}', '${now}')`);
  await client.exec(`INSERT INTO subscriptions (id, org_id, plan, status, current_period_start, current_period_end, created_at, updated_at) VALUES ('${nanoid()}', '${orgId}', 'growth', 'trialing', '${now}', '${new Date(Date.now() + 13 * 86400000).toISOString()}', '${now}', '${now}')`);

  // ---------------------------------------------------------------------
  // Collections activity. Without these the inbox, the promise and dispute
  // panels on a customer, the dunning performance table and the upgrade
  // requests admin screen all render only their empty states — so none of
  // that UI could be reviewed against the dev org. Mirrors the same rows
  // /api/seed-sample loads for a real Postgres org.
  // ---------------------------------------------------------------------
  const q = (v: string) => v.replace(/'/g, "''");
  const ago = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
  const ahead = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

  // One row per classification so every badge variant is exercised.
  const inbox = [
    { cust: 'Westgate Advisory', inv: 'INV-2390', cls: 'will_pay_date', from: 'finance@westgate.example',
      subj: 'Re: Invoice INV-2390 is now 38 days past due',
      body: "Apologies for the delay — this slipped when our controller left. It's approved now and goes out in Friday's payment run.",
      sum: 'Confirms payment scheduled for Friday; delay caused by staff turnover.',
      act: 'Log a promise to pay for Friday and pause the sequence until then.', st: 'new', promise: 3 },
    { cust: 'Harbor Painting Co', inv: 'INV-2402', cls: 'already_paid', from: 'bills@harborpainting.example',
      subj: 'Re: Quick reminder — Invoice INV-2402',
      body: 'We paid this by bank transfer last week, reference HP-4482. Can you check your account?',
      sum: 'Customer says already paid by bank transfer, ref HP-4482.',
      act: 'Reconcile against the bank feed before sending anything further.', st: 'new', promise: 0 },
    { cust: 'Acme Studios', inv: 'INV-2370', cls: 'disputed', from: 'bills@acmestudio.example',
      subj: 'Re: Action required: Invoice INV-2370',
      body: "We're not paying until the scope discrepancy is resolved. The SOW covered three deliverables, we were billed for five.",
      sum: 'Disputes the amount — billed for five deliverables against a three-deliverable SOW.',
      act: 'Open a dispute, stop dunning, get the SOW to the account lead.', st: 'handled', promise: 0 },
    { cust: 'Northstar Marketing', inv: 'INV-2380', cls: 'missing_po', from: 'ap@northstar.example',
      subj: 'Re: Invoice INV-2380 is 67 days past due',
      body: 'Our AP system rejects anything without a PO number. Please reissue with PO 88-2231 and we can process it.',
      sum: 'Blocked in AP — needs the invoice reissued carrying PO 88-2231.',
      act: 'Reissue with the PO number, then resume the sequence.', st: 'new', promise: 0 },
    { cust: 'Riverstone Co.', inv: 'INV-2405', cls: 'general_question', from: 'hello@riverstone.example',
      subj: 'Re: Invoice INV-2405',
      body: 'Do you take ACH? The card fee is steep on an amount this size.',
      sum: 'Asks whether ACH is available instead of card.',
      act: 'Reply with the ACH option on the payment portal.', st: 'new', promise: 0 },
  ];
  for (const m of inbox) {
    const cid = custMap.get(m.cust); const iid = invMap.get(m.inv);
    if (!cid || !iid) continue;
    const pd = m.promise ? `'${ahead(m.promise)}'` : 'NULL';
    await client.exec(`INSERT INTO inbox_messages (id, org_id, customer_id, invoice_id, channel, from_address, from_name, subject, body, classification, classification_confidence, ai_summary, ai_recommended_action, ai_suggested_promise_date, status, received_at, created_at) VALUES ('${nanoid()}', '${orgId}', '${cid}', '${iid}', 'email', '${m.from}', '${q(m.cust)}', '${q(m.subj)}', '${q(m.body)}', '${m.cls}', 0.900, '${q(m.sum)}', '${q(m.act)}', ${pd}, '${m.st}', '${ago(1)}', '${now}')`);
  }

  for (const pr of [
    { cust: 'Westgate Advisory', inv: 'INV-2390', amt: '42000.00', inDays: 3, src: 'Email reply — Friday payment run' },
    { cust: 'Northstar Marketing', inv: 'INV-2380', amt: '7500.00', inDays: 10, src: 'Said on call — half now, half next month' },
  ]) {
    const cid = custMap.get(pr.cust); const iid = invMap.get(pr.inv);
    if (!cid || !iid) continue;
    await client.exec(`INSERT INTO promises_to_pay (id, org_id, invoice_id, customer_id, promised_date, promised_amount, currency, status, source_text, created_at, updated_at) VALUES ('${nanoid()}', '${orgId}', '${iid}', '${cid}', '${ahead(pr.inDays)}', ${pr.amt}, 'USD', 'active', '${q(pr.src)}', '${ago(1)}', '${ago(1)}')`);
  }

  for (const d of [
    { cust: 'Acme Studios', inv: 'INV-2370', reason: 'amount_incorrect', msg: 'SOW covered three deliverables, invoice bills for five.' },
    { cust: 'Northstar Marketing', inv: 'INV-2380', reason: 'missing_po', msg: 'AP rejects invoices with no PO number. Need PO 88-2231 on it.' },
  ]) {
    const cid = custMap.get(d.cust); const iid = invMap.get(d.inv);
    if (!cid || !iid) continue;
    await client.exec(`INSERT INTO disputes (id, org_id, invoice_id, customer_id, reason, status, customer_message, created_at, updated_at) VALUES ('${nanoid()}', '${orgId}', '${iid}', '${cid}', '${d.reason}', 'open', '${q(d.msg)}', '${ago(2)}', '${ago(2)}')`);
  }

  // stepId must vary per invoice — dunning_runs_invoice_seq_step_uniq.
  for (const r of [
    { inv: 'INV-2390', step: 's1', ch: 'email', st: 'delivered', d: 9 },
    { inv: 'INV-2390', step: 's2', ch: 'email', st: 'sent', d: 2 },
    { inv: 'INV-2380', step: 's1', ch: 'email', st: 'delivered', d: 30 },
    { inv: 'INV-2380', step: 's3', ch: 'email', st: 'failed', d: 8 },
    { inv: 'INV-2370', step: 's4', ch: 'sms', st: 'sent', d: 5 },
    { inv: 'INV-2402', step: 's1', ch: 'email', st: 'delivered', d: 1 },
  ]) {
    const iid = invMap.get(r.inv);
    if (!iid) continue;
    const subj = r.ch === 'email' ? `'Invoice ${r.inv}'` : 'NULL';
    const err = r.st === 'failed' ? `'SMTP 550: mailbox unavailable'` : 'NULL';
    await client.exec(`INSERT INTO dunning_runs (id, org_id, invoice_id, sequence_id, step_id, channel, status, scheduled_for, sent_at, subject, body, error, created_at) VALUES ('${nanoid()}', '${orgId}', '${iid}', '${seqId}', '${r.step}', '${r.ch}', '${r.st}', '${ago(r.d)}', '${ago(r.d)}', ${subj}, 'Sample reminder body generated for the dev dataset.', ${err}, '${ago(r.d)}')`);
  }

  for (const u of [
    { plan: 'growth', name: 'Priya Raman', biz: 'Westgate Advisory', cc: 'US', st: 'pending', notes: 'Wants to move up before quarter end. Asked about ACH.' },
    { plan: 'starter', name: 'Tom Ackerley', biz: 'Pinecone Bakery', cc: 'GB', st: 'paid', notes: 'Invoiced via Wise, settled.' },
  ]) {
    const slug = u.biz.toLowerCase().replace(/[^a-z0-9]+/g, '');
    await client.exec(`INSERT INTO upgrade_requests (id, org_id, plan, customer_email, customer_name, business_name, country, notes, status, created_at, updated_at) VALUES ('${nanoid()}', '${orgId}', '${u.plan}', 'billing@${slug}.example', '${q(u.name)}', '${q(u.biz)}', '${u.cc}', '${q(u.notes)}', '${u.st}', '${ago(6)}', '${ago(2)}')`);
  }
}
