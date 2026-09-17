import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';

/**
 * Load sample data for the current org. Idempotent: only loads if the org
 * has no customers yet. Designed for the "Try the demo" flow on the
 * integrations page and the empty-state first-run checklist.
 */
export async function POST() {
  await ensureBootstrapped();
  const { orgId } = await getAuth();
  if (!orgId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const existing = await db.select().from(schema.customers).where(eq(schema.customers.orgId, orgId)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ ok: true, loaded: false, reason: 'Org already has data. Clear data first to re-seed.' });
  }

  const now = new Date();
  const { nanoid } = await import('@/lib/utils');
  const custList: Array<{ name: string; email: string; phone: string; company: string; channel: 'email' | 'sms'; behavior: NonNullable<schema.Customer['paymentBehavior']> }> = [
    { name: 'Brightline Legal', email: 'ap@brightline.example', phone: '+14155551234', company: 'Brightline Legal LLP', channel: 'email', behavior: { avgDaysToPay: 28, paidRate: 0.95, lastPaidAt: new Date(now.getTime() - 12 * 86400000).toISOString(), riskScore: 15 } },
    { name: 'Harbor Painting Co', email: 'bills@harborpainting.example', phone: '+14155555678', company: 'Harbor Painting', channel: 'sms', behavior: { avgDaysToPay: 14, paidRate: 0.99, lastPaidAt: new Date(now.getTime() - 3 * 86400000).toISOString(), riskScore: 8 } },
    { name: 'Westgate Advisory', email: 'finance@westgate.example', phone: '+12125559001', company: 'Westgate Advisory', channel: 'email', behavior: { avgDaysToPay: 47, paidRate: 0.78, lastPaidAt: new Date(now.getTime() - 40 * 86400000).toISOString(), riskScore: 62 } },
    { name: 'Northstar Marketing', email: 'ap@northstar.example', phone: '+12125559002', company: 'Northstar Marketing', channel: 'email', behavior: { avgDaysToPay: 65, paidRate: 0.55, lastPaidAt: new Date(now.getTime() - 70 * 86400000).toISOString(), riskScore: 78 } },
    { name: 'Acme Studios', email: 'bills@acmestudio.example', phone: '+13105559003', company: 'Acme Studios', channel: 'email', behavior: { avgDaysToPay: 95, paidRate: 0.32, lastPaidAt: new Date(now.getTime() - 95 * 86400000).toISOString(), riskScore: 88 } },
    { name: 'Riverstone Co.', email: 'hello@riverstone.example', phone: '+447700900123', company: 'Riverstone Co', channel: 'email', behavior: { avgDaysToPay: 21, paidRate: 0.92, lastPaidAt: new Date(now.getTime() - 18 * 86400000).toISOString(), riskScore: 22 } },
    { name: 'Lakeside Therapy', email: 'admin@lakeside.example', phone: '+16125551111', company: 'Lakeside Therapy Group', channel: 'email', behavior: { avgDaysToPay: 32, paidRate: 0.88, lastPaidAt: new Date(now.getTime() - 25 * 86400000).toISOString(), riskScore: 35 } },
    { name: 'Pinecone Bakery', email: 'bills@pinecone.example', phone: '+12065552222', company: 'Pinecone Bakery', channel: 'email', behavior: { avgDaysToPay: 7, paidRate: 1.0, lastPaidAt: new Date(now.getTime() - 2 * 86400000).toISOString(), riskScore: 5 } },
  ];
  const custIds: Record<string, string> = {};
  now.toISOString();
  for (const c of custList) {
    const id = nanoid();
    custIds[c.name] = id;
    await db.insert(schema.customers).values({
      id, orgId, name: c.name, email: c.email, phone: c.phone, company: c.company,
      preferredChannel: c.channel, paymentBehavior: c.behavior, createdAt: now, updatedAt: now,
    });
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
    { cust: 'Lakeside Therapy', number: 'INV-2415', amount: '5400.00', daysAgo: 22 },
    { cust: 'Pinecone Bakery', number: 'INV-2420', amount: '1200.00', daysAgo: -1 },
  ];
  // Invoice ids are captured by number so the inbox / promise / dispute /
  // dunning rows below can reference real invoices instead of inventing ids.
  const invIds: Record<string, string> = {};
  for (const inv of invoices) {
    const cid = custIds[inv.cust];
    if (!cid) continue;
    const issue = new Date(now.getTime() - inv.daysAgo * 86400000);
    const due = new Date(issue.getTime() + 30 * 86400000);
    // Net-30 terms: due = issue + 30d, so only invoices issued more than 30
    // days ago are actually past due. See the same fix in bootstrap-db.ts.
    const status = inv.daysAgo > 30 ? 'overdue' : 'sent';
    const invId = nanoid();
    invIds[inv.number] = invId;
    await db.insert(schema.invoices).values({
      id: invId, orgId, customerId: cid, number: inv.number, status, amount: inv.amount, amountPaid: '0',
      currency: 'USD', issueDate: issue, dueDate: due, description: `${inv.cust} services`, createdAt: now, updatedAt: now,
    });
  }

  // One paid invoice + payment (so DSO history exists)
  const paidCust = custIds['Brightline Legal'];
  const paidIssue = new Date(now.getTime() - 25 * 86400000);
  const paidDue = new Date(paidIssue.getTime() + 30 * 86400000);
  const paidPaidAt = new Date(now.getTime() - 18 * 86400000);
  const paidId = nanoid();
  await db.insert(schema.invoices).values({
    id: paidId, orgId, customerId: paidCust, number: 'INV-2395', status: 'paid',
    amount: '18000.00', amountPaid: '18000.00', currency: 'USD', issueDate: paidIssue, dueDate: paidDue, paidAt: paidPaidAt,
    description: 'Brand sprint', createdAt: now, updatedAt: now,
  });
  await db.insert(schema.payments).values({
    id: nanoid(), orgId, invoiceId: paidId, customerId: paidCust, amount: '18000.00', currency: 'USD',
    method: 'ach', paidAt: paidPaidAt, createdAt: now,
  });
  await db.insert(schema.payments).values({
    id: nanoid(), orgId, invoiceId: paidId, customerId: paidCust, amount: '4500.00', currency: 'USD',
    method: 'card', paidAt: new Date(now.getTime() - 4 * 86400000), createdAt: now,
  });
  // Mark a connection as connected so "Quick actions" doesn't nag
  await db.insert(schema.integrations).values({
    id: nanoid(), orgId, provider: 'quickbooks', status: 'connected', realmId: 'demo-realm-1',
    lastSyncAt: now, createdAt: now, updatedAt: now,
  }).onConflictDoNothing();

  // ---------------------------------------------------------------------
  // Collections activity. Without these rows the inbox, the promise and
  // dispute panels on a customer, the dunning performance table and the
  // upgrade-request admin screen all render only their empty states, so
  // none of that UI can be reviewed locally.
  // ---------------------------------------------------------------------
  const days = (n: number) => new Date(now.getTime() - n * 86400000);

  // One row per classification so every badge variant is exercised.
  const inbox: Array<{
    cust: string; invoice: string; classification: string; subject: string;
    body: string; summary: string; action: string; status?: string; promiseIn?: number;
  }> = [
    {
      cust: 'Westgate Advisory', invoice: 'INV-2390', classification: 'will_pay_date',
      subject: 'Re: Invoice INV-2390 is now 38 days past due',
      body: "Apologies for the delay — this slipped through when our controller left. It's approved now and going out in Friday's payment run.",
      summary: 'Confirms payment scheduled for Friday; delay caused by staff turnover.',
      action: 'Log a promise to pay for Friday and pause the sequence until then.',
      promiseIn: 3,
    },
    {
      cust: 'Harbor Painting Co', invoice: 'INV-2402', classification: 'already_paid',
      subject: 'Re: Quick reminder — Invoice INV-2402',
      body: 'We paid this by bank transfer last week, reference HP-4482. Can you check your account?',
      summary: 'Customer says already paid by bank transfer, ref HP-4482.',
      action: 'Reconcile against the bank feed before sending anything further.',
    },
    {
      cust: 'Acme Studios', invoice: 'INV-2370', classification: 'disputed',
      subject: 'Re: Action required: Invoice INV-2370',
      body: "We're not paying this until the scope discrepancy is resolved. The SOW covered three deliverables, we were billed for five.",
      summary: 'Disputes the amount — says billed for five deliverables against a three-deliverable SOW.',
      action: 'Open a dispute, stop dunning, and get the SOW in front of the account lead.',
      status: 'handled',
    },
    {
      cust: 'Northstar Marketing', invoice: 'INV-2380', classification: 'missing_po',
      subject: 'Re: Invoice INV-2380 is 67 days past due',
      body: 'Our AP system rejects anything without a PO number on the invoice. Please reissue with PO 88-2231 and we can process it.',
      summary: 'Blocked in AP — needs the invoice reissued carrying PO 88-2231.',
      action: 'Reissue with the PO number, then resume the sequence.',
    },
    {
      cust: 'Lakeside Therapy', invoice: 'INV-2415', classification: 'general_question',
      subject: 'Re: Invoice INV-2415',
      body: 'Do you take ACH? The card fee is steep on an amount this size.',
      summary: 'Asks whether ACH is available instead of card.',
      action: 'Reply with the ACH option on the payment portal.',
    },
  ];
  for (const m of inbox) {
    const cid = custIds[m.cust];
    const iid = invIds[m.invoice];
    if (!cid || !iid) continue;
    await db.insert(schema.inboxMessages).values({
      id: nanoid(), orgId, customerId: cid, invoiceId: iid, channel: 'email',
      fromAddress: custList.find((c) => c.name === m.cust)?.email ?? null,
      fromName: m.cust, subject: m.subject, body: m.body,
      classification: m.classification, classificationConfidence: '0.900',
      aiSummary: m.summary, aiRecommendedAction: m.action,
      aiSuggestedPromiseDate: m.promiseIn ? new Date(now.getTime() + m.promiseIn * 86400000) : null,
      status: m.status ?? 'new', receivedAt: days(1), createdAt: now,
    });
  }

  // Active promises to pay, against genuinely overdue invoices.
  for (const pr of [
    { cust: 'Westgate Advisory', invoice: 'INV-2390', amount: '42000.00', inDays: 3, source: 'Email reply, Friday payment run' },
    { cust: 'Northstar Marketing', invoice: 'INV-2380', amount: '7500.00', inDays: 10, source: 'Said on call — paying half now, half next month' },
  ]) {
    const cid = custIds[pr.cust];
    const iid = invIds[pr.invoice];
    if (!cid || !iid) continue;
    await db.insert(schema.promisesToPay).values({
      id: nanoid(), orgId, invoiceId: iid, customerId: cid,
      promisedDate: new Date(now.getTime() + pr.inDays * 86400000),
      promisedAmount: pr.amount, currency: 'USD', status: 'active',
      sourceText: pr.source, createdAt: days(1), updatedAt: days(1),
    });
  }

  // Open disputes.
  for (const d of [
    { cust: 'Acme Studios', invoice: 'INV-2370', reason: 'amount_incorrect', message: 'SOW covered three deliverables, invoice bills for five.' },
    { cust: 'Northstar Marketing', invoice: 'INV-2380', reason: 'missing_po', message: 'AP rejects invoices with no PO number. Need PO 88-2231 on it.' },
  ]) {
    const cid = custIds[d.cust];
    const iid = invIds[d.invoice];
    if (!cid || !iid) continue;
    await db.insert(schema.disputes).values({
      id: nanoid(), orgId, invoiceId: iid, customerId: cid, reason: d.reason,
      status: 'open', customerMessage: d.message, createdAt: days(2), updatedAt: days(2),
    });
  }

  // Dunning history, so the performance table and its badges render. The
  // unique index on (invoice, sequence, step) means stepId must vary per
  // invoice — hence the explicit step per row.
  const [seq] = await db.select().from(schema.dunningSequences).where(eq(schema.dunningSequences.orgId, orgId)).limit(1);
  if (seq) {
    for (const r of [
      { invoice: 'INV-2390', step: 's1', channel: 'email' as const, status: 'delivered' as const, sentDaysAgo: 9 },
      { invoice: 'INV-2390', step: 's2', channel: 'email' as const, status: 'sent' as const, sentDaysAgo: 2 },
      { invoice: 'INV-2380', step: 's1', channel: 'email' as const, status: 'delivered' as const, sentDaysAgo: 30 },
      { invoice: 'INV-2380', step: 's3', channel: 'email' as const, status: 'failed' as const, sentDaysAgo: 8 },
      { invoice: 'INV-2370', step: 's4', channel: 'sms' as const, status: 'sent' as const, sentDaysAgo: 5 },
      { invoice: 'INV-2415', step: 's1', channel: 'email' as const, status: 'delivered' as const, sentDaysAgo: 1 },
    ]) {
      const iid = invIds[r.invoice];
      if (!iid) continue;
      await db.insert(schema.dunningRuns).values({
        id: nanoid(), orgId, invoiceId: iid, sequenceId: seq.id, stepId: r.step,
        channel: r.channel, status: r.status,
        scheduledFor: days(r.sentDaysAgo), sentAt: days(r.sentDaysAgo),
        subject: r.channel === 'email' ? `Invoice ${r.invoice}` : null,
        body: 'Sample reminder body generated for the demo dataset.',
        error: r.status === 'failed' ? 'SMTP 550: mailbox unavailable' : null,
        createdAt: days(r.sentDaysAgo),
      });
    }
  }

  // Upgrade requests — one pending (renders the action cards), one settled
  // (renders the archive table) on /admin/upgrade-requests.
  for (const u of [
    { plan: 'growth' as const, name: 'Priya Raman', business: 'Westgate Advisory', country: 'US', status: 'pending', notes: 'Wants to move up before quarter end. Asked about ACH.' },
    { plan: 'starter' as const, name: 'Tom Ackerley', business: 'Pinecone Bakery', country: 'GB', status: 'paid', notes: 'Invoiced via Wise, settled.' },
  ]) {
    await db.insert(schema.upgradeRequests).values({
      id: nanoid(), orgId, plan: u.plan,
      customerEmail: `billing@${u.business.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example`,
      customerName: u.name, businessName: u.business, country: u.country,
      notes: u.notes, status: u.status, createdAt: days(6), updatedAt: days(2),
    });
  }

  return NextResponse.json({
    ok: true, loaded: true,
    customers: custList.length,
    invoices: invoices.length + 1,
    inbox: inbox.length,
  });
}
