#!/usr/bin/env node
// X (Twitter) API v2 recent search, last 7 days. Needs X_BEARER_TOKEN in the shell environment.
// Usage: node outreach/leads/sources/x-api.mjs --out outreach/leads/runs/2026-10-06/x.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = '-is:retweet -is:reply lang:en';
export const QUERIES = [
  `("chasing invoices" OR "chasing payment" OR "client won't pay" OR "clients won't pay" OR "late paying clients") ${BASE}`,
  `("overdue invoice" OR "overdue invoices" OR "unpaid invoice" OR "unpaid invoices" OR "invoice reminder") ${BASE}`,
  `("accounts receivable" OR "late payment" OR "slow payers") (bookkeeper OR agency OR freelancer OR "small business") ${BASE}`,
  `(#bookkeeping OR #smallbiz OR #accounting OR #freelance) ("unpaid" OR "overdue" OR "late payment") ${BASE}`,
];

/** Map one tweet to a lead item. No handle is kept, and the URL form needs none. */
export function mapTweet(t) {
  const m = t?.public_metrics ?? {};
  return {
    id: `X-${t.id}`, platform: 'x', url: `https://x.com/i/web/status/${t.id}`, community: 'X',
    title: String(t.text ?? '').slice(0, 90), text: String(t.text ?? '').slice(0, 600),
    createdAt: t.created_at, score: (m.like_count ?? 0) + (m.retweet_count ?? 0), comments: m.reply_count ?? 0, locked: false, flags: [],
  };
}

async function main() {
  const bearer = process.env.X_BEARER_TOKEN;
  if (!bearer) { console.error('Set X_BEARER_TOKEN in your shell first.'); process.exit(2); }
  const out = process.argv[process.argv.indexOf('--out') + 1];
  if (!out || out.startsWith('--')) { console.error('Pass --out <file.json>'); process.exit(2); }
  const byId = new Map();
  for (const query of QUERIES) {
    const url = `https://api.twitter.com/2/tweets/search/recent?${new URLSearchParams({ query, max_results: '50', 'tweet.fields': 'created_at,public_metrics,lang' })}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` } });
    if (!res.ok) { console.error(`query failed: ${res.status}`); continue; }
    for (const t of (await res.json()).data ?? []) { const it = mapTweet(t); if (!byId.has(it.id)) byId.set(it.id, it); }
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify([...byId.values()], null, 2));
  console.log(`${byId.size} tweets written to ${out}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
