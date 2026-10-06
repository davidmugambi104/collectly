#!/usr/bin/env node
// Reddit API fetcher (read-only search). Needs REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in the shell environment.
// Read-only: it only asks Reddit to search and never posts, votes or messages.
// Usage:
//   node outreach/leads/sources/reddit-api.mjs --check                      (token request only; proves the keys work)
//   node outreach/leads/sources/reddit-api.mjs --out outreach/leads/runs/2026-10-06/reddit.json [--days 7] [--subs a,b,c] [--queries "q1|q2"]
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

/** Keep only posts created within the last `days` days (the API's t=week filter is coarse). */
export function inWindow(item, days, now = new Date()) {
  const t = Date.parse(item?.createdAt);
  return Number.isFinite(t) && now.getTime() - t <= days * 86400000 && t <= now.getTime() + 3600000;
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
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined; };
  const ua = 'mugavi-lead-sourcing/1.0 (read-only search)';
  const tok = await token(id, secret, ua);
  if (process.argv.includes('--check')) { console.log('Reddit credentials OK (token received). Nothing was searched or written.'); return; }
  const out = arg('out');
  if (!out) { console.error('Pass --out <file.json> (or --check)'); process.exit(2); }
  const days = Number(arg('days') ?? 7);
  const subs = arg('subs') ? arg('subs').split(',').map((s) => s.trim()).filter(Boolean) : SUBREDDITS;
  const queries = arg('queries') ? arg('queries').split('|').map((s) => s.trim()).filter(Boolean) : QUERIES;
  const byId = new Map();
  let seen = 0;
  for (const sub of subs) for (const q of queries) {
    const url = `https://oauth.reddit.com/r/${sub}/search?${new URLSearchParams({ q, restrict_sr: '1', sort: 'new', t: days <= 7 ? 'week' : days <= 31 ? 'month' : 'year', limit: '100', raw_json: '1' })}`;
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(url, { headers: { Authorization: `Bearer ${tok}`, 'User-Agent': ua } });
      if (res.status !== 429) break;
      const wait = Math.min(60, Number(res.headers.get('retry-after')) || 5 * (attempt + 1));
      console.error(`429 from Reddit, waiting ${wait}s`);
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
    if (!res.ok) { console.error(`r/${sub} "${q}": ${res.status}`); continue; }
    for (const c of (await res.json()).data?.children ?? []) {
      seen++;
      const it = mapPost(c);
      if (inWindow(it, days) && !byId.has(it.id)) byId.set(it.id, it);
    }
    await new Promise((r) => setTimeout(r, 700)); // well under Reddit's rate limit
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify([...byId.values()], null, 2));
  console.log(`${byId.size} posts from the last ${days} days written to ${out} (${seen} results read across ${subs.length} subreddits x ${queries.length} queries)`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
