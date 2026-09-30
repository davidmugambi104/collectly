import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, STANDARD_STEPS, findPreset } from './presets.ts';

test('every preset has unique step ids and days that only go up', () => {
  for (const p of PRESETS) {
    assert.equal(new Set(p.steps.map((s) => s.id)).size, p.steps.length, p.id);
    const days = p.steps.map((s) => s.daysFromDue);
    assert.deepEqual(days, [...days].sort((a, b) => a - b), p.id);
    assert.ok(days[0] >= 1, p.id);
  }
});

test('every step carries the payment link, and email steps have a subject', () => {
  for (const p of PRESETS) for (const s of p.steps) {
    assert.match(s.template, /\{\{payment_link\}\}/, `${p.id}/${s.id}`);
    if (s.channel === 'email') assert.ok(s.subject, `${p.id}/${s.id}`);
  }
});

test('the blurbs agree with the steps', () => {
  for (const p of PRESETS) {
    const hasSms = p.steps.some((s) => s.channel === 'sms');
    assert.equal(/\btext\b/i.test(p.blurb) && !/No texts/.test(p.blurb), hasSms, p.id);
    const emails = p.steps.filter((s) => s.channel === 'email').length;
    assert.ok(p.blurb.startsWith(emails === 3 ? 'Three emails' : 'Four emails'), p.id);
    for (const d of p.steps.map((s) => s.daysFromDue)) assert.ok(p.blurb.includes(String(d)), `${p.id} day ${d}`);
  }
});

test('standard is the schedule accounts always started with', () => {
  assert.equal(findPreset('standard')?.steps, STANDARD_STEPS);
  assert.equal(STANDARD_STEPS.length, 4);
  assert.equal(findPreset('nope'), undefined);
});
