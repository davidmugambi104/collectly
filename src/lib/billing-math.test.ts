import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { applyPayment, applyRefund } from './billing-math.ts';

describe('applyPayment', () => {
  test('partial payment leaves the invoice partial with correct balance', () => {
    const r = applyPayment(0, 40, 100);
    assert.equal(r.newAmountPaid, 40);
    assert.equal(r.status, 'partial');
  });

  test('exact full payment marks the invoice paid', () => {
    const r = applyPayment(0, 100, 100);
    assert.equal(r.newAmountPaid, 100);
    assert.equal(r.status, 'paid');
  });

  test('second payment that completes a partial balance marks paid', () => {
    const r = applyPayment(40, 60, 100);
    assert.equal(r.newAmountPaid, 100);
    assert.equal(r.status, 'paid');
  });

  test('half-cent rounding tolerance still counts as paid in full', () => {
    // e.g. 99.996 rounds to 100.00 after DB string round-trip — must not get
    // stuck in 'partial' forever due to floating point drift.
    const r = applyPayment(0, 99.996, 100);
    assert.equal(r.status, 'paid');
  });

  test('a cent short of the total is NOT treated as paid in full', () => {
    const r = applyPayment(0, 98.99, 100);
    assert.equal(r.status, 'partial');
  });

  test('overpayment is still marked paid (no negative-balance branch)', () => {
    const r = applyPayment(0, 150, 100);
    assert.equal(r.newAmountPaid, 150);
    assert.equal(r.status, 'paid');
  });
});

describe('applyRefund', () => {
  test('full refund of a fully-paid invoice rolls status back to sent', () => {
    const r = applyRefund(100, 100, 100);
    assert.equal(r.newAmountPaid, 0);
    assert.equal(r.status, 'sent');
  });

  test('partial refund of a fully-paid invoice moves it to partial', () => {
    const r = applyRefund(100, 30, 100);
    assert.equal(r.newAmountPaid, 70);
    assert.equal(r.status, 'partial');
  });

  test('refund never drives the balance negative even if it exceeds amountPaid', () => {
    const r = applyRefund(20, 50, 100);
    assert.equal(r.newAmountPaid, 0);
    assert.equal(r.status, 'sent');
  });

  test('tiny refund that keeps balance within half-cent tolerance stays paid', () => {
    const r = applyRefund(100, 0.001, 100);
    assert.equal(r.status, 'paid');
  });

  test('refund on a partially-paid invoice recomputes down to partial or sent correctly', () => {
    const partial = applyRefund(50, 10, 100);
    assert.equal(partial.newAmountPaid, 40);
    assert.equal(partial.status, 'partial');

    const emptied = applyRefund(50, 50, 100);
    assert.equal(emptied.newAmountPaid, 0);
    assert.equal(emptied.status, 'sent');
  });
});
