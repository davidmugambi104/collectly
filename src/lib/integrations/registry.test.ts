import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROVIDERS, providerCardState, registryServices, missingEnv, UNAVAILABLE_LABEL, BETA_LABEL, providerDef } from './registry.ts';
import { configStatus, SERVICES } from '../config-status.ts';
import { ADAPTERS, getAdapter } from './adapters/index.ts';
import { IMPORT_PROVIDERS, PROVIDER_ID_PATTERN, PREFIXED_PROVIDERS, parseImportProvider, externalIdFor, matchesProviderId, isQboId, isXeroId } from './imported-data.ts';

test('every provider has a purge pattern, and every prefixed provider is in the registry', () => {
  for (const p of PROVIDERS) assert.ok(PROVIDER_ID_PATTERN[p.id], p.id);
  for (const id of PREFIXED_PROVIDERS) assert.ok(providerDef(id), id);
  assert.deepEqual([...IMPORT_PROVIDERS].sort(), PROVIDERS.map((p) => p.id).sort());
});

test('a card without keys says it is not available; with keys but no adapter it still does; with both it is beta', () => {
  const fb = providerDef('freshbooks')!;
  const keys = Object.fromEntries(fb.envVars.map((v) => [v, 'x']));
  assert.equal(providerCardState(fb, true, {}).badge, UNAVAILABLE_LABEL);
  assert.equal(providerCardState(fb, false, keys).state, 'unavailable');
  assert.equal(providerCardState(fb, true, { ...keys, [fb.envVars[0]]: '  ' }).state, 'unavailable');
  const ok = providerCardState(fb, true, keys);
  assert.equal(ok.state, 'beta'); assert.equal(ok.badge, BETA_LABEL);
  assert.equal(providerCardState(providerDef('csv')!, false, {}).state, 'file');
  assert.equal(providerCardState(providerDef('xero')!, false, Object.fromEntries(providerDef('xero')!.envVars.map((v) => [v, 'x']))).state, 'beta');
});

test('the labels are the exact honest wording', () => {
  assert.equal(UNAVAILABLE_LABEL, 'Not available yet - needs setup by Mugavi');
  assert.equal(BETA_LABEL, 'Beta - not tested against the live service');
});

test('config-status gets one optional row per new oauth provider, all later, with no duplicates', () => {
  const rows = registryServices();
  assert.deepEqual(rows.map((r) => r.id), ['freshbooks', 'zoho_books', 'sage', 'wave']);
  assert.ok(rows.every((r) => r.needed === 'later' && r.vars.length === 3));
  const ids = SERVICES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  const st = configStatus({});
  assert.equal(st.find((s) => s.id === 'sage')!.configured, false);
  assert.equal(configStatus({ SAGE_CLIENT_ID: 'a', SAGE_CLIENT_SECRET: 'b', SAGE_REDIRECT_URI: 'c' }).find((s) => s.id === 'sage')!.configured, true);
  assert.deepEqual(missingEnv(providerDef('wave')!, { WAVE_CLIENT_ID: 'a' }), ['WAVE_CLIENT_SECRET', 'WAVE_REDIRECT_URI']);
});

test('no adapter is registered yet, and a registered one must use its own id and its prefixed pattern', () => {
  for (const [id, a] of Object.entries(ADAPTERS)) { assert.equal(a!.id, id); assert.equal(getAdapter(id), a); }
  assert.equal(getAdapter('nope'), null);
});

test('prefixed ids never collide with QuickBooks or Xero ids and never match hand-typed ones', () => {
  for (const p of PREFIXED_PROVIDERS) {
    const id = externalIdFor(p, '123');
    assert.equal(id, `${p}:123`); assert.equal(externalIdFor(p, id), id);
    assert.ok(matchesProviderId(p, id)); assert.ok(!isQboId(id) && !isXeroId(id));
    for (const hand of ['123', 'INV-1', 'DEMO-001', 'my csv:1', '9f5bca33-8590-4b6f-acfb-e85712b10217', '', null]) assert.ok(!matchesProviderId(p, hand as string));
    for (const other of PREFIXED_PROVIDERS) if (other !== p) assert.ok(!matchesProviderId(other, id));
  }
  assert.ok(!matchesProviderId('quickbooks', 'freshbooks:123'));
  assert.equal(parseImportProvider('csv'), 'csv'); assert.equal(parseImportProvider("csv'; drop"), null);
});
