import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estimateCostMicros, buildUsageRow, recordUsageWith, smsSegments, USAGE_KINDS, type UsageRow } from './usage-meter-core.ts';
import { AI_COST_MICROS_PER_CALL, EMAIL_COST_MICROS, SMS_SEGMENT_COST_MICROS } from './usage-costs.ts';
import { buildUsageReport, planPrice, isCostFlagged, marginUsd } from './usage-report.ts';

test('cost maths: email, AI by model, SMS per segment', () => {
  assert.equal(estimateCostMicros('email_sent'), EMAIL_COST_MICROS);
  assert.equal(estimateCostMicros('statement_email', 3), 3 * EMAIL_COST_MICROS);
  assert.equal(estimateCostMicros('ai_draft', 1, 'gemini-flash-lite-latest'), AI_COST_MICROS_PER_CALL['gemini-flash-lite-latest']);
  // An unknown model is not free and not invented: it falls back to the known default model's rate.
  assert.ok(estimateCostMicros('ai_draft', 1, 'some-future-model') > 0);
  assert.equal(estimateCostMicros('sms_sent', 2), 2 * SMS_SEGMENT_COST_MICROS);
  assert.equal(estimateCostMicros('sms_sent', 1.2), 2 * SMS_SEGMENT_COST_MICROS, 'rounds units up');
  for (const k of USAGE_KINDS) assert.ok(Number.isInteger(estimateCostMicros(k, 1)) && estimateCostMicros(k, 1) > 0);
});

test('sms segments: GSM-7 vs unicode, single vs multipart', () => {
  assert.equal(smsSegments('x'.repeat(160)), 1);
  assert.equal(smsSegments('x'.repeat(161)), 2);
  assert.equal(smsSegments('x'.repeat(306)), 2);
  assert.equal(smsSegments('x'.repeat(307)), 3);
  assert.equal(smsSegments('€'.repeat(80)), 1); // 2 each = 160
  assert.equal(smsSegments('é'.repeat(70)), 1);
  assert.equal(smsSegments('’'.repeat(70)), 1); // curly quote forces UCS-2
  assert.equal(smsSegments('’'.repeat(71)), 2);
  assert.equal(smsSegments(''), 1);
});

test('buildUsageRow clamps units and rejects bad input', () => {
  assert.equal(buildUsageRow({ orgId: 'org_1', kind: 'email_sent' })?.units, 1);
  assert.equal(buildUsageRow({ orgId: 'org_1', kind: 'sms_sent', units: 99999 })?.units, 1000);
  assert.equal(buildUsageRow({ orgId: 'org_1', kind: 'sms_sent', units: -4 })?.units, 1);
  assert.equal(buildUsageRow({ orgId: 'org_1', kind: 'nope' as never }), null);
});

test('fail open: a throwing writer returns false and never throws', async () => {
  const ok = await recordUsageWith(async () => { throw new Error('db down'); }, { orgId: 'org_1', kind: 'email_sent' });
  assert.equal(ok, false);
  const sync = await recordUsageWith((() => { throw new Error('sync boom'); }) as never, { orgId: 'org_1', kind: 'email_sent' });
  assert.equal(sync, false);
  assert.equal(await recordUsageWith(async () => {}, null as never), false);
});

test('fail open: a hung writer is abandoned after the timeout', async () => {
  const t0 = Date.now();
  const ok = await recordUsageWith(() => new Promise<void>(() => {}), { orgId: 'org_1', kind: 'email_sent' }, 50);
  assert.equal(ok, false);
  assert.ok(Date.now() - t0 < 1000);
});

test('records a good row through the writer', async () => {
  const seen: UsageRow[] = [];
  assert.equal(await recordUsageWith(async (r) => { seen.push(r); }, { orgId: 'org_1', kind: 'sms_sent', units: 2 }), true);
  assert.deepEqual(seen[0], { orgId: 'org_1', kind: 'sms_sent', units: 2, model: null, costMicros: 2 * SMS_SEGMENT_COST_MICROS });
});

test('no PII: an email, phone or name in the id fields is dropped, and rows hold only the allowed keys', async () => {
  for (const bad of ['jane@example.com', '+15551234567', 'Jane Smith', 'a'.repeat(65), '']) {
    assert.equal(buildUsageRow({ orgId: bad, kind: 'email_sent' }), null, bad);
  }
  // A message text smuggled in as the model is replaced by the default model id, not stored.
  const row = buildUsageRow({ orgId: 'org_1', kind: 'ai_draft', model: 'Hello Jane, you owe $400' });
  assert.ok(row && !/Jane/.test(JSON.stringify(row)));
  assert.deepEqual(Object.keys(row!).sort(), ['costMicros', 'kind', 'model', 'orgId', 'units']);
});

test('no PII: the table definition has no customer-data columns, and call sites pass only ids and counts', () => {
  const ddl = readFileSync(new URL('../../drizzle/0020_usage_events.sql', import.meta.url), 'utf8');
  const cols = [...ddl.matchAll(/^\s{2}(\w+) /gm)].map((m) => m[1]);
  assert.deepEqual(cols, ['id', 'org_id', 'kind', 'units', 'model', 'est_cost_micros', 'created_at']);
  const calls = [
    'dunning/scheduler.ts', 'dunning/deliver.ts', 'recipients-send.ts', 'statements-send.ts', 'inbox-inbound.ts', 'sms-consent.ts',
    '../app/api/dunning/send/route.ts', '../app/api/dunning/test/route.ts', '../app/api/inbox/[id]/reply/route.ts',
  ];
  for (const f of calls) {
    const src = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
    const uses = src.match(/recordUsage\(\{[^}]*\}\)/g) ?? [];
    assert.ok(uses.length > 0, `${f} meters something`);
    for (const u of uses) {
      const props = [...u.matchAll(/(\w+):\s*([^,}]+)/g)].map((m) => [m[1], m[2].trim()]);
      for (const [k, v] of props) {
        assert.ok(['orgId', 'kind', 'units', 'model'].includes(k), `${f}: unexpected key ${k}`);
        if (k === 'orgId') assert.match(v, /^(seq\.orgId|orgId|o\.orgId|invoice\.orgId|org\.id|row\.customer\.orgId)$/, `${f}: ${u}`);
        if (k === 'units') assert.match(v, /^smsSegments\((final\.body|data\.body|result\.body|body|reply)\)$/, `${f}: ${u}`);
      }
    }
  }
});

const NOW = new Date('2026-10-15T12:00:00Z');
const ev = (orgId: string, kind: string, costMicros: number, daysAgo: number, units = 1) => ({ orgId, kind, units, costMicros, createdAt: new Date(NOW.getTime() - daysAgo * 86_400_000) });

test('plan price is honest about what is known', () => {
  assert.deepEqual(planPrice(undefined), { kind: 'unknown' });
  assert.equal(planPrice({ orgId: 'a', plan: 'growth', status: 'active', stripeSubscriptionId: null }).kind, 'manual');
  assert.equal(planPrice({ orgId: 'a', plan: 'growth', status: 'active', stripeSubscriptionId: 'sub_1' }).kind, 'list');
  assert.equal(planPrice({ orgId: 'a', plan: 'growth', status: 'trialing', stripeSubscriptionId: 'sub_1' }).kind, 'trial');
  assert.equal(planPrice({ orgId: 'a', plan: 'growth', status: 'cancelled', stripeSubscriptionId: 'sub_1' }).kind, 'none');
});

test('flag at more than 10% of a known price; never for manual or unknown', () => {
  const p = { kind: 'list', plan: 'starter', usd: 79 } as const;
  assert.equal(isCostFlagged(7_900_000, p), false); // exactly 10%
  assert.equal(isCostFlagged(7_900_001, p), true);
  assert.equal(isCostFlagged(99_000_000, { kind: 'manual', plan: 'growth' }), false);
  assert.equal(isCostFlagged(99_000_000, { kind: 'unknown' }), false);
  assert.equal(marginUsd(9_000_000, p), 70);
  assert.equal(marginUsd(1, { kind: 'manual', plan: 'growth' }), null);
});

test('report: windows, totals, and unpaid orgs stay visible', () => {
  const r = buildUsageReport({
    now: NOW,
    orgs: [{ id: 'a', name: 'Acme' }, { id: 'b', name: 'Beta' }],
    subs: [
      { orgId: 'a', plan: 'starter', status: 'active', stripeSubscriptionId: 'sub_1' },
      { orgId: 'b', plan: 'growth', status: 'active', stripeSubscriptionId: null },
    ],
    events: [
      ev('a', 'email_sent', 1000, 1), ev('a', 'sms_sent', 10_000_000, 2, 2), // this month and last 30
      ev('a', 'email_sent', 1000, 20), // last 30, not this month (Sep 25)
      ev('a', 'email_sent', 1000, 40), // outside both
      ev('b', 'ai_draft', 500, 3),
    ],
  });
  const a = r.orgs.find((o) => o.orgId === 'a')!;
  assert.equal(a.last30.costMicros, 10_002_000);
  assert.equal(a.month.costMicros, 10_001_000);
  assert.equal(a.month.byKind.sms_sent, 2);
  assert.equal(a.flagged, true);
  assert.equal(r.orgs.find((o) => o.orgId === 'b')!.flagged, false);
  assert.equal(r.orgs.find((o) => o.orgId === 'b')!.marginMonthUsd, null);
  assert.equal(r.totals.last30.costMicros, 10_002_500);
  assert.equal(r.totals.flaggedCount, 1);
  assert.equal(r.totals.knownRevenueUsd, 79);
});
