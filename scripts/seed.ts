/**
 * Dev seed — push schema, create org, customers, invoices, payments, dunning seq.
 * Run with: USE_PGLITE=1 npx tsx scripts/seed.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { db, schema } from '../src/db';
import { sql } from 'drizzle-orm';
import { nanoid } from '../src/lib/utils';

async function main() {
  console.log('Seeding database...');

  // 1. Push schema (CREATE TABLE IF NOT EXISTS)
  const tables = [
    schema.users, schema.organizations, schema.memberships,
    schema.customers, schema.invoices, schema.payments, schema.integrations,
    schema.dunningSequences, schema.dunningRuns, schema.subscriptions, schema.events,
    schema.waitlist,
  ];
  for (const table of tables) {
    try {
      const ddl = (table as any)[Symbol.for('drizzle:Name')];
      // Use drizzle-kit-style introspection instead
    } catch {}
  }

  // 2. Wipe + insert
  await db.delete(schema.dunningRuns);
  await db.delete(schema.dunningSequences);
  await db.delete(schema.payments);
  await db.delete(schema.invoices);
  await db.delete(schema.customers);
  await db.delete(schema.integrations);
  await db.delete(schema.subscriptions);
  await db.delete(schema.memberships);
  await db.delete(schema.organizations);
  await db.delete(schema.users);

  const userId = 'user_dev_davie';
  const orgId = 'org_demo_collectly';

  await db.insert(schema.users).values({ id: userId, clerkId: userId, email: 'davie@collectly.app', name: 'Davie' });
  await db.insert(schema.organizations).values({
    id: orgId, name: 'Lumen & Co', slug: 'lumen-co',
    baseCurrency: 'USD', country: 'US', timezone: 'America/New_York',
    businessType: 'Design agency', ownerId: userId, plan: 'growth', trialEndsAt: new Date(Date.now() + 13 * 86400000),
  });
  await db.insert(schema.memberships).values({ id: nanoid(), userId, orgId, role: 'owner' });

  await db.insert(schema.integrations).values([
    { id: nanoid(), orgId, provider: 'quickbooks', status: 'connected', realmId: 'demo-realm-1', lastSyncAt: new Date() },
    { id: nanoid(), orgId, provider: 'stripe', status: 'connected', lastSyncAt: new Date() },
  ]);

  // Customers
  const customers = [
    { name: 'Brightline Legal', email: 'ap@brightlinelegal.com', phone: '+14155551234', company: 'Brightline Legal LLP', preferredChannel: 'email' as const, behavior: { avgDaysToPay: 28, paidRate: 0.95, lastPaidAt: new Date(Date.now() - 12 * 86400000).toISOString(), riskScore: 15 } },
    { name: 'Harbor Painting Co', email: 'bills@harborpainting.com', phone: '+14155555678', company: 'Harbor Painting', preferredChannel: 'sms' as const, behavior: { avgDaysToPay: 14, paidRate: 0.99, lastPaidAt: new Date(Date.now() - 3 * 86400000).toISOString(), riskScore: 8 } },
    { name: 'Westgate Advisory', email: 'finance@westgate.com', phone: '+12125559001', company: 'Westgate Advisory', preferredChannel: 'email' as const, behavior: { avgDaysToPay: 47, paidRate: 0.78, lastPaidAt: new Date(Date.now() - 40 * 86400000).toISOString(), riskScore: 62 } },
    { name: 'Northstar Marketing', email: 'ap@northstar.io', phone: '+12125559002', company: 'Northstar Marketing', preferredChannel: 'email' as const, behavior: { avgDaysToPay: 65, paidRate: 0.55, lastPaidAt: new Date(Date.now() - 70 * 86400000).toISOString(), riskScore: 78 } },
    { name: 'Acme Studios', email: 'bills@acmestudios.com', phone: '+13105559003', company: 'Acme Studios', preferredChannel: 'email' as const, behavior: { avgDaysToPay: 95, paidRate: 0.32, lastPaidAt: new Date(Date.now() - 95 * 86400000).toISOString(), riskScore: 88 } },
    { name: 'Riverstone Co.', email: 'hello@riverstone.co', phone: '+447700900123', company: 'Riverstone Co', preferredChannel: 'email' as const, behavior: { avgDaysToPay: 21, paidRate: 0.92, lastPaidAt: new Date(Date.now() - 18 * 86400000).toISOString(), riskScore: 22 } },
  ];

  const customerRows: any[] = [];
  for (const c of customers) {
    const [row] = await db.insert(schema.customers).values({
      id: nanoid(), orgId, name: c.name, email: c.email, phone: c.phone, company: c.company,
      preferredChannel: c.preferredChannel, paymentBehavior: c.behavior as any,
    }).returning();
    customerRows.push(row);
  }

  // Invoices
  const invoices = [
    { cust: 'Brightline Legal', number: 'INV-2401', amount: '24500.00', daysAgo: 4, status: 'overdue' as const },
    { cust: 'Harbor Painting Co', number: 'INV-2402', amount: '8200.00', daysAgo: 12, status: 'overdue' as const },
    { cust: 'Westgate Advisory', number: 'INV-2390', amount: '42000.00', daysAgo: 38, status: 'overdue' as const },
    { cust: 'Northstar Marketing', number: 'INV-2380', amount: '15750.00', daysAgo: 67, status: 'overdue' as const },
    { cust: 'Acme Studios', number: 'INV-2370', amount: '93800.00', daysAgo: 95, status: 'overdue' as const },
    { cust: 'Riverstone Co.', number: 'INV-2405', amount: '6300.00', daysAgo: -3, status: 'sent' as const }, // not yet due
    { cust: 'Brightline Legal', number: 'INV-2410', amount: '12500.00', daysAgo: -10, status: 'sent' as const },
    { cust: 'Westgate Advisory', number: 'INV-2412', amount: '8800.00', daysAgo: -2, status: 'sent' as const },
  ];

  for (const inv of invoices) {
    const cust = customerRows.find((c) => c.name === inv.cust)!;
    const issue = new Date(Date.now() - inv.daysAgo * 86400000);
    const due = new Date(issue.getTime() + 30 * 86400000);
    await db.insert(schema.invoices).values({
      id: nanoid(), orgId, customerId: cust.id, number: inv.number, status: inv.status,
      amount: inv.amount, amountPaid: '0', currency: 'USD',
      issueDate: issue, dueDate: due,
      description: `Design services — ${inv.cust}`,
    });
  }

  // Recent paid invoice for collection stats
  const cust = customerRows[0];
  const paidIssue = new Date(Date.now() - 25 * 86400000);
  const [paidInv] = await db.insert(schema.invoices).values({
    id: nanoid(), orgId, customerId: cust.id, number: 'INV-2395', status: 'paid',
    amount: '18000.00', amountPaid: '18000.00', currency: 'USD',
    issueDate: paidIssue, dueDate: new Date(paidIssue.getTime() + 30 * 86400000),
    paidAt: new Date(Date.now() - 18 * 86400000),
    description: 'Brand sprint — paid',
  }).returning();
  await db.insert(schema.payments).values({
    id: nanoid(), orgId, invoiceId: paidInv.id, customerId: cust.id,
    amount: '18000.00', currency: 'USD', method: 'ach', paidAt: new Date(Date.now() - 18 * 86400000),
  });

  // Default dunning sequence
  await db.insert(schema.dunningSequences).values({
    id: nanoid(), orgId, name: 'Default', isActive: true, steps: [
      { id: 's1', daysFromDue: 1, channel: 'email', tone: 'friendly', subject: 'Quick reminder — Invoice {{number}}', template: 'Hi {{contact_name}}, just a quick nudge that Invoice {{number}} for {{amount}} was due on {{due_date}}. You can settle it here: {{payment_link}}' },
      { id: 's2', daysFromDue: 7, channel: 'email', tone: 'firm', subject: 'Invoice {{number}} is now 7 days past due', template: 'Hi {{contact_name}}, Invoice {{number}} for {{amount}} is now 7 days past due. Please review and settle at your earliest convenience: {{payment_link}}' },
      { id: 's3', daysFromDue: 14, channel: 'email', tone: 'firm', subject: 'Action required: Invoice {{number}}', template: 'Hi {{contact_name}}, our records show Invoice {{number}} for {{amount}} is 14 days overdue. Please confirm payment status or settle the balance: {{payment_link}}' },
      { id: 's4', daysFromDue: 30, channel: 'sms', tone: 'final', subject: undefined as any, template: 'Final notice: Invoice {{number}} for {{amount}} is 30+ days overdue. Please reply or settle: {{payment_link}}' },
    ] as any, pauseOnReply: true, pauseOnPayment: true,
  });

  // Active subscription
  await db.insert(schema.subscriptions).values({
    id: nanoid(), orgId, plan: 'growth', status: 'trialing',
    currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 13 * 86400000),
  });

  console.log('✅ Seed complete.');
  console.log('  Org:', orgId);
  console.log('  Customers:', customerRows.length);
  console.log('  Invoices:', invoices.length + 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
