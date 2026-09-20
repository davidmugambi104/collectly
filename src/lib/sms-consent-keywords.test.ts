import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyInboundSms } from './sms-consent-keywords.ts';

test('opt-in keywords', () => {
  for (const s of ['YES', 'yes', ' Yes ', 'yes.', 'Y', 'START', 'JOIN', 'UNSTOP']) {
    assert.equal(classifyInboundSms(s), 'opt_in', s);
  }
});

test("Twilio's full opt-out set, since the carrier honours all of them", () => {
  // If our list is narrower than Twilio's, the carrier stops delivery while our
  // database still says opted_in -- and we would keep queueing sends.
  for (const s of ['STOP', 'stop', 'StopAll', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']) {
    assert.equal(classifyInboundSms(s), 'opt_out', s);
  }
});

test('help keywords', () => {
  assert.equal(classifyInboundSms('HELP'), 'help');
  assert.equal(classifyInboundSms('info'), 'help');
});

test('a sentence containing a keyword is not the keyword', () => {
  // Twilio's rule is that the whole message must be the keyword. Matching on a
  // prefix would read this as consent withdrawal when it is a support request.
  assert.equal(classifyInboundSms('stop sending these to the wrong address'), 'unknown');
  assert.equal(classifyInboundSms('yes I already paid this one last week'), 'unknown');
  assert.equal(classifyInboundSms('can you help me find the invoice'), 'unknown');
});

test('empty, whitespace and null are unknown, never a silent opt-in', () => {
  for (const s of ['', '   ', '\n', null, undefined]) {
    assert.equal(classifyInboundSms(s), 'unknown', JSON.stringify(s));
  }
});
