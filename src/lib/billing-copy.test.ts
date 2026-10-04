import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { billingCopy, PORTAL_PAYMENT_ANSWER } from './billing-copy.ts';
import { FOUNDING } from './utils.ts';

const BANNED = [/mobile[- ]?money/i, /m-?pesa/i, /kenya/i, /\bKES\b/, /paystack/i, /\bWise\b/, /PayPal/i];

describe('billingCopy', () => {
  for (const ready of [false, true]) {
    const c = billingCopy(ready);
    test(`checkoutReady=${ready}: no banned words, no dashes, no stray regions`, () => {
      const all = [...Object.values(c).filter((v): v is string => typeof v === 'string'), PORTAL_PAYMENT_ANSWER].join('\n');
      for (const re of BANNED) assert.doesNotMatch(all, re);
      assert.doesNotMatch(all, /[\u2013\u2014]/);
    });
    test(`checkoutReady=${ready}: founding statement kept`, () => {
      assert.match(c.howBillingWorks, new RegExp(`first ${FOUNDING.seats} founding customers take ${FOUNDING.discountPct}% off for ${FOUNDING.months} months, applied by hand`));
    });
  }
  test('off: says manual invoice for everyone and checkout not switched on', () => {
    const c = billingCopy(false);
    assert.match(c.howBillingWorks, /manual invoice for everyone today/);
    assert.match(c.howBillingWorks, /not switched on yet/);
    assert.match(c.terms, /manual invoice/);
  });
  test('on: says card and ACH checkout, never "not switched on"', () => {
    const c = billingCopy(true);
    assert.match(c.howBillingWorks, /ACH/);
    for (const v of [c.howBillingWorks, c.terms, c.llms, c.dashboardNote, c.dashboardFootnote]) assert.doesNotMatch(v, /not switched on|not live/);
  });
});

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n) && !/\.test\./.test(n)) out.push(p);
  }
  return out;
}

describe('marketing pages stay US and UK only', () => {
  const root = join(import.meta.dirname, '..');
  // Homepage files are owned by the user's uncommitted edits and reported separately.
  const SKIP = new Set(['app/page.tsx', 'components/marketing/product-showcase.tsx']);
  const files = [
    ...walk(join(root, 'app')).filter((f) => !/[\\/]app[\\/](api|dashboard|admin)[\\/]/.test(f)),
    ...walk(join(root, 'components', 'marketing')),
    join(root, 'app', 'dashboard', 'billing', 'page.tsx'),
  ].filter((f) => !SKIP.has(relative(root, f).split('\\').join('/')));
  const FORBIDDEN = [/mobile[- ]?money/i, /m-?pesa/i, /kenya/i];

  test('scans a real set of files', () => assert.ok(files.length > 30));
  for (const re of FORBIDDEN) {
    test(`no ${re} in marketing pages`, () => {
      const hits = files.filter((f) => re.test(readFileSync(f, 'utf8'))).map((f) => relative(root, f));
      assert.deepEqual(hits, []);
    });
  }
  test('no Wise or PayPal payment-method claims in marketing pages', () => {
    const hits = files.filter((f) => /\b(Wise|PayPal)\b/.test(readFileSync(f, 'utf8'))).map((f) => relative(root, f));
    assert.deepEqual(hits, []);
  });
});
