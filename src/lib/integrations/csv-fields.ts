/** The columns the spreadsheet import understands. Kept apart from csv-import.ts so the browser can import it (that file uses node:crypto). */
export const FIELDS = ['invoiceNumber', 'customerName', 'customerEmail', 'amount', 'balance', 'currency', 'issueDate', 'dueDate', 'status'] as const;
export type Field = (typeof FIELDS)[number];
export const FIELD_LABEL: Record<Field, string> = {
  invoiceNumber: 'Invoice number', customerName: 'Customer name', customerEmail: 'Customer email (optional)', amount: 'Amount (invoice total)',
  balance: 'Balance (amount still due)', currency: 'Currency', issueDate: 'Issue date', dueDate: 'Due date', status: 'Status (optional)',
};
/** Index of the column for each field, or null / missing when there is none. */
export type Mapping = Partial<Record<Field, number | null>>;
