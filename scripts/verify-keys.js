#!/usr/bin/env node
/**
 * Verifies which API keys in .env.local are present and (where possible) live.
 *
 * NEVER prints key values. Only prints key names and "set"/"empty" status,
 * plus per-provider live-test results.
 */
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envFile)) {
  console.log(JSON.stringify({ error: '.env.local not found' }));
  process.exit(1);
}

const lines = fs.readFileSync(envFile, 'utf8').split('\n');
const env = {};
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(?:"([^"]*)"|(.*))$/);
  if (m) {
    const key = m[1];
    const val = m[2] !== undefined ? m[2] : m[3];
    if (val && val !== '<set>') env[key] = val;
  }
}

const report = {
  keysPresent: Object.keys(env).length,
  byCategory: {
    database: { DATABASE_URL: !!env.DATABASE_URL, USE_PGLITE: env.USE_PGLITE, USE_DEV_AUTH: env.USE_DEV_AUTH },
    auth: { CLERK_PUB: !!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET: !!env.CLERK_SECRET_KEY },
    email: { RESEND: !!env.RESEND_API_KEY, FROM: env.RESEND_FROM_EMAIL || null },
    stripe: { SECRET: !!env.STRIPE_SECRET_KEY, PUB: !!env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, WEBHOOK: !!env.STRIPE_WEBHOOK_SECRET, CONNECT: !!env.STRIPE_CONNECT_CLIENT_ID },
    openai: { KEY: !!env.OPENAI_API_KEY },
    qbo: { ID: !!env.QBO_CLIENT_ID, SECRET: !!env.QBO_CLIENT_SECRET, ENV: env.QBO_ENVIRONMENT || null },
    plaid: { ID: !!env.PLAID_CLIENT_ID, SECRET: !!env.PLAID_SECRET, ENV: env.PLAID_ENV || null },
    posthog: { KEY: !!env.NEXT_PUBLIC_POSTHOG_KEY, HOST: !!env.NEXT_PUBLIC_POSTHOG_HOST },
  },
};

async function liveTest() {
  const tests = [];

  // Stripe
  if (env.STRIPE_SECRET_KEY) {
    try {
      const r = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
      });
      const j = await r.json();
      tests.push({ provider: 'stripe', ok: r.ok, mode: j.livemode ? 'live' : 'test', error: r.ok ? null : (j.error?.message || 'unknown') });
    } catch (e) { tests.push({ provider: 'stripe', ok: false, error: e.message }); }
  }

  // Resend
  if (env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
      });
      const j = await r.json();
      tests.push({
        provider: 'resend',
        ok: r.ok,
        domains: r.ok ? (j.data?.length || 0) : 0,
        error: r.ok ? null : (j.message || 'unknown'),
      });
    } catch (e) { tests.push({ provider: 'resend', ok: false, error: e.message }); }
  }

  // OpenAI
  if (env.OPENAI_API_KEY) {
    try {
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      });
      tests.push({ provider: 'openai', ok: r.ok, status: r.status });
    } catch (e) { tests.push({ provider: 'openai', ok: false, error: e.message }); }
  }

  // Plaid (sandbox by default)
  if (env.PLAID_CLIENT_ID && env.PLAID_SECRET) {
    const base = env.PLAID_ENV === 'production' ? 'https://production.plaid.com' : 'https://sandbox.plaid.com';
    try {
      const r = await fetch(`${base}/sandbox/item/fire_webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.PLAID_CLIENT_ID,
          secret: env.PLAID_SECRET,
          access_token: 'sandbox-test',
          webhook_code: 'DEFAULT_UPDATE',
        }),
      });
      const j = await r.json();
      tests.push({
        provider: 'plaid',
        ok: r.ok,
        env: env.PLAID_ENV || 'sandbox',
        error: r.ok ? null : (j.error_message || 'unknown'),
      });
    } catch (e) { tests.push({ provider: 'plaid', ok: false, error: e.message }); }
  }

  // Neon: try a no-op query
  if (env.DATABASE_URL) {
    try {
      const { Client } = require('pg');
      const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await client.connect();
      const r = await client.query('SELECT 1 as ok, current_database() as db, version() as ver');
      await client.end();
      tests.push({ provider: 'neon', ok: true, database: r.rows[0].db, version: r.rows[0].ver.slice(0, 60) });
    } catch (e) { tests.push({ provider: 'neon', ok: false, error: e.message }); }
  }

  return tests;
}

(async () => {
  const live = await liveTest();
  console.log(JSON.stringify({ report, liveTests: live }, null, 2));
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
