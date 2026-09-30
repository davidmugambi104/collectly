import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callTaskNote, callTaskTitle } from './call-task.ts';

const base = { customerName: 'Acme', invoiceNumber: 'INV-1', amount: '$1,200.00', daysOverdue: 18, phone: '+254700000001', notes: null };

test('title', () => assert.equal(callTaskTitle('Acme', 'INV-1'), 'Call Acme about invoice INV-1'));

test('says who, what, how late, and the number', () => {
  const n = callTaskNote(base);
  assert.match(n, /Ring Acme about invoice INV-1: \$1,200\.00 is 18 days past due\./);
  assert.match(n, /Phone: \+254700000001/);
});

test('wording before and on the due date', () => {
  assert.match(callTaskNote({ ...base, daysOverdue: 1 }), /is 1 day past due/);
  assert.match(callTaskNote({ ...base, daysOverdue: 0 }), /is due today/);
  assert.match(callTaskNote({ ...base, daysOverdue: -3 }), /is due in 3 days/);
  assert.match(callTaskNote({ ...base, daysOverdue: -1 }), /is due in 1 day\./);
});

test('no phone on file is said plainly, not hidden', () => {
  assert.match(callTaskNote({ ...base, phone: null }), /no phone number on file/);
  assert.match(callTaskNote({ ...base, phone: '  ' }), /no phone number on file/);
});

test('the step author\'s notes are included when present', () => {
  assert.match(callTaskNote({ ...base, notes: ' Ask about the PO. ' }), /Your notes: Ask about the PO\./);
  assert.doesNotMatch(callTaskNote(base), /Your notes/);
});
