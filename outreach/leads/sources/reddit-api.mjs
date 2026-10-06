#!/usr/bin/env node
// Reddit API fetcher (read-only search). Needs REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in the shell environment.
// Usage: node outreach/leads/sources/reddit-api.mjs --out outreach/leads/runs/2026-10-06/reddit.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SUBREDDITS = ['marketing', 'smallbusiness', 'smallbusinessowner', 'bookkeeping', 'accounting', 'QuickBooks', 'xero', 'Entrepreneur', 'agency', 'PPC', 'digital_marketing'];
export const QUERIES = ['chasing invoices', 'unpaid invoice', 'late payment', 'overdue invoice', 'client won\'t pay', 'invoice reminder', 'accounts receivable', 'cash flow unpaid clients', 'net 30'];

/** Map one Reddit listing child to a lead item. No author field is kept. */
export function mapPost(child) {
  const d = child?.data ?? {};
  return {
    id: `RD-${d.id}`, platform: 'reddit', url: `https://www.reddit.com${d.permalink}`, community: `r/${d.subreddit}`,
    title: d.title ?? '', text: String(d.selftext ?? '').slice(0, 600),
    createdAt: new Date((d.created_utc ?? 0) * 1000).toISOString(), score: d.score ?? 0, comments: d.num_comments ?? 0,
    locked: Boolean(d.locked || d.archived), flags: [],
  };
}

async function token(id, secret, ua) {
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': ua },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Reddit token request failed: ${res.status}`);
  return (await res.json()).access_token;
}

async function main() {
  const id = process.env.REDDIT_CLIENT_ID, secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) { console.error('Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in your shell first.'); process.exit(2); }
  const out = process.argv[process.argv.indexOf('--out') + 1];
  if (!out || out.startsWith('--')) { console.error('Pass --out <file.json>'); process.exit(2); }
  const ua = 'mugavi-lead-sourcing/1.0 (read-only search)';
  const tok = await token(id, secret, ua);
  const byId = new Map();
  for (const sub of SUBREDDITS) for (const q of QUERIES) {
    const url = `https://oauth.reddit.com/r/${sub}/search?${new URLSearchParams({ q, restrict_sr: '1', sort: 'new', t: 'week', limit: '50', raw_json: '1' })}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}`, 'User-Agent': ua } });
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 5000)); continue; }
    if (!res.ok) { console.error(`r/${sub} "${q}": ${res.status}`); continue; }
    for (const c of (await res.json()).data?.children ?? []) { const it = mapPost(c); if (!byId.has(it.id)) byId.set(it.id, it); }
    await new Promise((r) => setTimeout(r, 700)); // stay well under the rate limit
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify([...byId.values()], null, 2));
  console.log(`${byId.size} posts written to ${out}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
