/**
 * Whole-workspace data export, pure part: rows in, CSV text and a ZIP out. The database half is export-data-load.ts.
 * Every file is plain CSV that opens in a spreadsheet; cells that could run as a formula are neutralised by toCsv.
 */
import { toCsv } from './csv.ts';
import { buildStatement, type StatementInvoice, type StatementFee } from './statements.ts';
import { makeZip } from './zip.ts';

export const EXPORT_DATASETS = ['customers', 'invoices', 'reminders', 'statements'] as const;
export type ExportDataset = (typeof EXPORT_DATASETS)[number];
export function parseDataset(v: unknown): ExportDataset | null {
  return (EXPORT_DATASETS as readonly string[]).includes(v as string) ? (v as ExportDataset) : null;
}

export type ExportCustomer = { id: string; externalId: string | null; name: string; company: string | null; email: string | null; phone: string | null; preferredChannel: string; doNotContact: boolean; smsConsent: string; notes: string | null; createdAt: Date };
export type ExportInvoice = { id: string; externalId: string | null; number: string; customerId: string; customerName: string; status: string; currency: string; amount: string | number; amountPaid: string | number; issueDate: Date; dueDate: Date; paidAt: Date | null; description: string | null; lastReminderAt: Date | null };
export type ExportReminder = { id: string; createdAt: Date; customerName: string; invoiceNumber: string; channel: string; step: string; status: string; scheduledFor: Date; sentAt: Date | null; subject: string | null; body: string; error: string | null };
export type ExportStatementCustomer = { customerId: string; customerName: string; invoices: StatementInvoice[]; fees: StatementFee[] };
export type ExportStatementSent = { sentAt: Date; customerName: string; subject: string; sentBy: string | null; totals: Array<{ currency: string; totalCents: number; overdueCents: number }> };

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');
const money = (cents: number) => (cents / 100).toFixed(2);

export function customersCsv(rows: ExportCustomer[]): string {
  return toCsv(
    ['Customer ID', 'Source ID', 'Name', 'Company', 'Email', 'Phone', 'Preferred channel', 'Do not contact', 'SMS consent', 'Notes', 'Created'],
    rows.map((r) => [r.id, r.externalId, r.name, r.company, r.email, r.phone, r.preferredChannel, r.doNotContact ? 'yes' : 'no', r.smsConsent, r.notes, r.createdAt]),
  );
}

export function invoicesCsv(rows: ExportInvoice[]): string {
  return toCsv(
    ['Invoice ID', 'Source ID', 'Number', 'Customer ID', 'Customer', 'Status', 'Currency', 'Amount', 'Paid', 'Balance', 'Issued', 'Due', 'Paid on', 'Description', 'Last reminder'],
    rows.map((r) => [r.id, r.externalId, r.number, r.customerId, r.customerName, r.status, r.currency, Number(r.amount).toFixed(2), Number(r.amountPaid).toFixed(2), (Number(r.amount) - Number(r.amountPaid)).toFixed(2), day(r.issueDate), day(r.dueDate), day(r.paidAt), r.description, r.lastReminderAt]),
  );
}

export function remindersCsv(rows: ExportReminder[]): string {
  return toCsv(
    ['Created', 'Customer', 'Invoice', 'Channel', 'Step', 'Status', 'Scheduled for', 'Sent at', 'Subject', 'Message', 'Error'],
    rows.map((r) => [r.createdAt, r.customerName, r.invoiceNumber, r.channel, r.step, r.status, r.scheduledFor, r.sentAt, r.subject, r.body, r.error]),
  );
}

/** What each customer owes right now, one row per open invoice or late fee, plus the statements that were emailed. */
export function statementsCsv(customers: ExportStatementCustomer[], asOf: Date): string {
  const rows: unknown[][] = [];
  for (const c of customers) {
    const st = buildStatement(c.invoices, asOf, c.fees);
    for (const sec of st.sections) {
      for (const f of sec.fees) rows.push([c.customerName, `Late fee on ${f.invoiceNumber}`, sec.currency, '', '', money(f.amountCents), '0.00', money(f.amountCents), '', 'late fee', 'no']);
      for (const r of sec.rows) rows.push([c.customerName, r.number, sec.currency, day(r.issued), day(r.due), money(r.amountCents), money(r.paidCents), money(r.balanceCents), Math.max(0, r.daysOverdue), r.bucket, r.disputed ? 'yes' : 'no']);
    }
  }
  return toCsv(['Customer', 'Invoice', 'Currency', 'Issued', 'Due', 'Amount', 'Paid', 'Balance', 'Days overdue', 'Age bucket', 'In dispute'], rows);
}

export function statementsSentCsv(rows: ExportStatementSent[]): string {
  return toCsv(
    ['Sent at', 'Customer', 'Subject', 'Sent by', 'Totals'],
    rows.map((r) => [r.sentAt, r.customerName, r.subject, r.sentBy, r.totals.map((t) => `${t.currency} ${money(t.totalCents)} (overdue ${money(t.overdueCents)})`).join('; ')]),
  );
}

export type ExportBundle = {
  workspaceName: string;
  now: Date;
  customers: ExportCustomer[];
  invoices: ExportInvoice[];
  reminders: ExportReminder[];
  statements: ExportStatementCustomer[];
  statementsSent: ExportStatementSent[];
  /** True when a table hit the row cap, so the file is not the whole history. */
  truncated: string[];
};

export const EXPORT_ROW_CAP = 50_000;

export function readmeText(b: ExportBundle): string {
  const lines = [
    `Mugavi data export for ${b.workspaceName}`,
    `Made ${b.now.toISOString()}`,
    '',
    `customers.csv: ${b.customers.length} rows. Every customer in this workspace.`,
    `invoices.csv: ${b.invoices.length} rows. Every invoice, with amount, paid, balance and dates.`,
    `reminders.csv: ${b.reminders.length} rows. Every reminder scheduled or sent, with the message text.`,
    `statements.csv: what each customer owes as of this export, one row per open invoice or late fee.`,
    `statements-sent.csv: ${b.statementsSent.length} rows. Statements that were emailed.`,
    '',
    'Source ID is the id in QuickBooks, Xero or Square when the row was imported; blank for rows typed in here.',
    'Dates are UTC. Amounts are in each invoice\'s own currency.',
    'Not included: payment card data (we never hold it), integration tokens, and other people\'s accounts.',
  ];
  if (b.truncated.length) lines.push('', `Row cap of ${EXPORT_ROW_CAP} reached for: ${b.truncated.join(', ')}. Ask us for the rest.`);
  return lines.join('\r\n') + '\r\n';
}

export function exportZip(b: ExportBundle): Buffer {
  return makeZip([
    { name: 'README.txt', data: readmeText(b) },
    { name: 'customers.csv', data: customersCsv(b.customers) },
    { name: 'invoices.csv', data: invoicesCsv(b.invoices) },
    { name: 'reminders.csv', data: remindersCsv(b.reminders) },
    { name: 'statements.csv', data: statementsCsv(b.statements, b.now) },
    { name: 'statements-sent.csv', data: statementsSentCsv(b.statementsSent) },
  ], b.now);
}

export function exportCsv(dataset: ExportDataset, b: ExportBundle): string {
  switch (dataset) {
    case 'customers': return customersCsv(b.customers);
    case 'invoices': return invoicesCsv(b.invoices);
    case 'reminders': return remindersCsv(b.reminders);
    case 'statements': return statementsCsv(b.statements, b.now);
  }
}
