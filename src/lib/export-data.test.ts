import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportZip, exportCsv, parseDataset, statementsCsv, type ExportBundle } from './export-data.ts';
import { readZip, makeZip } from './zip.ts';
import { isOwnerOrAdmin } from './org-role.ts';

const now = new Date('2026-10-03T12:00:00Z');
const bundle: ExportBundle = {
  workspaceName: 'Acme Books', now, truncated: [],
  customers: [{ id: 'c1', externalId: '58', name: '=HYPERLINK("x")', company: null, email: null, phone: null, preferredChannel: 'email', doNotContact: false, smsConsent: 'none', notes: 'a, "b"', createdAt: now }],
  invoices: [{ id: 'i1', externalId: '1001', number: 'INV-1', customerId: 'c1', customerName: 'Zed', status: 'overdue', currency: 'USD', amount: '100.00', amountPaid: '40', issueDate: new Date('2026-08-01'), dueDate: new Date('2026-09-01'), paidAt: null, description: null, lastReminderAt: null }],
  reminders: [{ id: 'r1', createdAt: now, customerName: 'Zed', invoiceNumber: 'INV-1', channel: 'email', step: 's1', status: 'sent', scheduledFor: now, sentAt: now, subject: 'Hi', body: 'Line1\nLine2', error: null }],
  statements: [{ customerId: 'c1', customerName: 'Zed', invoices: [{ number: 'INV-1', currency: 'USD', status: 'overdue', issueDate: new Date('2026-08-01'), dueDate: new Date('2026-09-01'), amount: '100.00', amountPaid: '40' }], fees: [] }],
  statementsSent: [],
};

test('zip round-trips with valid crc and holds every file', () => {
  const files = readZip(exportZip(bundle));
  assert.deepEqual(Object.keys(files).sort(), ['README.txt', 'customers.csv', 'invoices.csv', 'reminders.csv', 'statements-sent.csv', 'statements.csv']);
  assert.match(files['README.txt'], /Acme Books/);
});

test('zip handles unicode names and empty files', () => {
  const out = readZip(makeZip([{ name: 'é.csv', data: 'Zoë\r\n' }, { name: 'empty.csv', data: '' }]));
  assert.equal(out['é.csv'], 'Zoë\r\n');
  assert.equal(out['empty.csv'], '');
});

test('csv cells that could run as formulas are neutralised and quoted properly', () => {
  const c = exportCsv('customers', bundle);
  assert.match(c, /'=HYPERLINK/);
  assert.match(c, /"a, ""b"""/);
});

test('invoices csv shows balance; statements csv shows what is owed', () => {
  assert.match(exportCsv('invoices', bundle), /100\.00,40\.00,60\.00/);
  const s = statementsCsv(bundle.statements, now);
  assert.match(s, /Zed,INV-1,USD,2026-08-01,2026-09-01,100\.00,40\.00,60\.00,32,31-60/);
});

test('fully paid invoices do not appear on statements', () => {
  const paid = { ...bundle.statements[0], invoices: [{ ...bundle.statements[0].invoices[0], amountPaid: '100' }] };
  assert.equal(statementsCsv([paid], now).trim().split('\r\n').length, 1);
});

test('reminder messages with line breaks stay in one quoted cell', () => {
  assert.match(exportCsv('reminders', bundle), /"Line1\nLine2"/);
});

test('dataset parsing only accepts the four names', () => {
  assert.equal(parseDataset('invoices'), 'invoices');
  assert.equal(parseDataset('../x'), null);
  assert.equal(parseDataset(null), null);
});

test('only the owner or an org admin may export', () => {
  assert.equal(isOwnerOrAdmin({ userId: 'u1', ownerId: 'u1' }), true);
  assert.equal(isOwnerOrAdmin({ userId: 'u2', ownerId: 'u1', orgRole: 'org:admin' }), true);
  assert.equal(isOwnerOrAdmin({ userId: 'u2', ownerId: 'u1', orgRole: 'org:member' }), false);
  assert.equal(isOwnerOrAdmin({ userId: null, ownerId: null, orgRole: 'org:admin' }), false);
});
