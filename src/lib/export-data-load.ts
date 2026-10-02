import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { customers, dunningRuns, invoices, organizations, statementLog } from '@/db/schema';
import { ensureDunningControlSchema } from '@/lib/dunning-control-schema';
import { loadOwedFees } from '@/lib/late-fees-load';
import { EXPORT_ROW_CAP, type ExportBundle, type ExportStatementCustomer } from '@/lib/export-data';

/** Everything in one workspace, for the export. Always scoped to orgId. */
export async function loadExportBundle(orgId: string, now: Date = new Date()): Promise<ExportBundle> {
  await ensureDunningControlSchema();
  const cap = EXPORT_ROW_CAP + 1;
  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const custRows = await db.select().from(customers).where(eq(customers.orgId, orgId)).orderBy(asc(customers.name)).limit(cap);
  const invRows = await db
    .select({ inv: invoices, customerName: customers.name })
    .from(invoices).innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(eq(invoices.orgId, orgId)).orderBy(desc(invoices.issueDate)).limit(cap);
  const runRows = await db
    .select({ run: dunningRuns, customerName: customers.name, number: invoices.number })
    .from(dunningRuns)
    .innerJoin(invoices, eq(invoices.id, dunningRuns.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(eq(dunningRuns.orgId, orgId)).orderBy(desc(dunningRuns.createdAt)).limit(cap);
  const sentRows = await db
    .select({ s: statementLog, customerName: customers.name })
    .from(statementLog).innerJoin(customers, eq(customers.id, statementLog.customerId))
    .where(eq(statementLog.orgId, orgId)).orderBy(desc(statementLog.sentAt)).limit(cap);
  const fees = await loadOwedFees(orgId);

  const truncated: string[] = [];
  const clip = <T extends unknown[]>(name: string, rows: T): T => { if (rows.length > EXPORT_ROW_CAP) { truncated.push(name); return rows.slice(0, EXPORT_ROW_CAP) as T; } return rows; };
  const cs = clip('customers', custRows);
  const is = clip('invoices', invRows);
  const rs = clip('reminders', runRows);
  const ss = clip('statements-sent', sentRows);

  const byCustomer = new Map<string, ExportStatementCustomer>();
  for (const c of cs) byCustomer.set(c.id, { customerId: c.id, customerName: c.name, invoices: [], fees: [] });
  for (const r of is) byCustomer.get(r.inv.customerId)?.invoices.push({ number: r.inv.number, currency: r.inv.currency, status: r.inv.status, issueDate: r.inv.issueDate, dueDate: r.inv.dueDate, amount: r.inv.amount, amountPaid: r.inv.amountPaid });
  for (const f of fees) byCustomer.get(f.customerId)?.fees.push({ invoiceNumber: f.invoiceNumber, amountCents: f.amountCents, currency: f.currency, period: f.period });

  return {
    workspaceName: org?.name ?? 'your workspace',
    now,
    customers: cs.map((c: (typeof cs)[number]) => ({ id: c.id, externalId: c.externalId, name: c.name, company: c.company, email: c.email, phone: c.phone, preferredChannel: c.preferredChannel, doNotContact: !!c.dndAt, smsConsent: c.smsConsentStatus, notes: c.notes, createdAt: c.createdAt })),
    invoices: is.map((r: (typeof is)[number]) => ({ id: r.inv.id, externalId: r.inv.externalId, number: r.inv.number, customerId: r.inv.customerId, customerName: r.customerName, status: r.inv.status, currency: r.inv.currency, amount: r.inv.amount, amountPaid: r.inv.amountPaid, issueDate: r.inv.issueDate, dueDate: r.inv.dueDate, paidAt: r.inv.paidAt, description: r.inv.description, lastReminderAt: r.inv.lastReminderAt })),
    reminders: rs.map((r: (typeof rs)[number]) => ({ id: r.run.id, createdAt: r.run.createdAt, customerName: r.customerName, invoiceNumber: r.number, channel: r.run.channel, step: r.run.stepId, status: r.run.status, scheduledFor: r.run.scheduledFor, sentAt: r.run.sentAt, subject: r.run.subject, body: r.run.body, error: r.run.error })),
    statements: [...byCustomer.values()],
    statementsSent: ss.map((r: (typeof ss)[number]) => ({ sentAt: r.s.sentAt, customerName: r.customerName, subject: r.s.subject, sentBy: r.s.sentBy, totals: r.s.totals })),
    truncated,
  };
}
