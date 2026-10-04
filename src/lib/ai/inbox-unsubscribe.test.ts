import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectUnsubscribeRequest, unsubscribeClassification, REPLY_CLASSIFICATIONS, parseModelClassification } from './inbox-rules.ts';

test('opt-out wording is detected', () => {
  for (const t of ['stop', 'STOP.', 'Unsubscribe', 'Please remove me from your list', 'Take me off this list.', 'stop emailing me', 'Please stop sending these reminders', 'Do not contact me again', "don't email me", 'no more emails please', 'I want to opt out', 'opt-out']) {
    assert.equal(detectUnsubscribeRequest(t), true, t);
  }
});

test('ordinary replies are not opt-outs', () => {
  for (const t of ['I will pay on Friday', 'Please stop by the office for the cheque', 'Can you resend the invoice?', 'Already paid last week', 'Remove the late fee please', 'Thanks, stopping payment was a mistake', '']) {
    assert.equal(detectUnsubscribeRequest(t), false, t);
  }
});

test('unsubscribe is a valid classification the model schema accepts', () => {
  assert.ok(REPLY_CLASSIFICATIONS.includes('unsubscribe'));
  const c = parseModelClassification(JSON.stringify({ ...unsubscribeClassification(), suggestedPromiseDate: null }));
  assert.equal(c.classification, 'unsubscribe');
});
