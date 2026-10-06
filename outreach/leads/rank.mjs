#!/usr/bin/env node
// Coordinator: merge platform item files, drop what should not be answered, rank, attach and lint drafts, write the report.
// Usage: node outreach/leads/rank.mjs --run 2026-10-06 [--top 25] [--max-age 7]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { excludeReason, scoreItem } from './lib/score.mjs';
import { lintDraft } from './lib/lint.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function buildReport({ items, drafts, now = new Date(), top = 25, maxAgeDays = 7 }) {
  const seen = new Set();
  const skipped = [];
  const ranked = [];
  for (const it of items) {
    const key = it.url || it.id;
    if (seen.has(key)) continue;
    seen.add(key);
    const why = excludeReason(it, { now, maxAgeDays });
    if (why) { skipped.push({ id: it.id, platform: it.platform, url: it.url, why }); continue; }
    const s = scoreItem(it, { now });
    if (s.relevance === 0) { skipped.push({ id: it.id, platform: it.platform, url: it.url, why: 'no invoice or payment pain in the text' }); continue; }
    const d = drafts[it.id] ?? null;
    const problems = d ? lintDraft(d, { platform: it.platform }) : ['no draft written'];
    ranked.push({ ...it, score: s.total, breakdown: s, draft: d, problems });
  }
  ranked.sort((a, b) => b.score - a.score || Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const shortlist = ranked.slice(0, top);
  const byPlatform = {};
  for (const r of ranked) byPlatform[r.platform] = (byPlatform[r.platform] ?? 0) + 1;
  return { generatedAt: now.toISOString(), total: items.length, kept: ranked.length, shortlist, skipped, byPlatform };
}

export function renderMarkdown(rep, date) {
  const L = [`# Lead shortlist, ${date}`, '', `${rep.kept} conversations worth a reply out of ${rep.total} found. Top ${rep.shortlist.length} below, best first. You post everything by hand; nothing here was sent.`, '',
    `By platform: ${Object.entries(rep.byPlatform).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}.`, ''];
  rep.shortlist.forEach((r, i) => {
    L.push(`## ${i + 1}. ${r.title || '(no title)'}`, '');
    L.push(`**${r.platform}** · ${r.community ?? ''} · score ${r.score} · ${r.comments ?? 0} comments · ${String(r.createdAt).slice(0, 10)}`, '');
    L.push(`Link: ${r.url}`, '');
    L.push(`**Pain point:** ${r.draft?.painPoint ?? '(none)'}`, '');
    if (r.draft?.reply) L.push('**Draft reply** (edit into your own words):', '', ...r.draft.reply.split('\n').map((l) => `> ${l}`), '');
    if (r.draft?.mentionsMugavi) L.push(`_Mentions Mugavi because: ${r.draft.mentionReason}_`, '');
    if (r.flags?.length) L.push(`**Agent flags:** ${r.flags.join(', ')}`, '');
    if (r.problems.length) L.push(`**Fix before posting:** ${r.problems.join('; ')}`, '');
    L.push(`_Why it ranks: relevance ${r.breakdown.relevance}, ICP ${r.breakdown.icp}, engagement ${r.breakdown.engagement}, recency ${r.breakdown.recency}, asking ${r.breakdown.asking}${r.breakdown.competitorMentioned ? ', a competitor is mentioned' : ''}._`, '', '---', '');
  });
  if (rep.skipped.length) {
    L.push('## Skipped', '');
    for (const s of rep.skipped) L.push(`- ${s.platform} ${s.id}: ${s.why} (${s.url})`);
  }
  return L.join('\n') + '\n';
}

export function renderHtml(rep, date) {
  const cards = rep.shortlist.map((r, i) => `
<article class="card">
  <div class="meta"><span class="tag">${esc(r.platform)}</span> ${esc(r.community ?? '')} · score ${r.score} · ${r.comments ?? 0} comments · ${esc(String(r.createdAt).slice(0, 10))}</div>
  <h2>${i + 1}. <a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title || r.url)}</a></h2>
  <p class="pain"><b>Pain point:</b> ${esc(r.draft?.painPoint ?? '(none)')}</p>
  ${r.draft?.reply ? `<pre class="reply" id="r${i}">${esc(r.draft.reply)}</pre><button type="button" onclick="copyReply(${i}, this)">Copy reply</button>` : ''}
  ${r.draft?.mentionsMugavi ? `<p class="note">Mentions Mugavi because: ${esc(r.draft.mentionReason)}</p>` : ''}
  ${r.flags?.length ? `<p class="note">Agent flags: ${esc(r.flags.join(', '))}</p>` : ''}
  ${r.problems.length ? `<p class="warn">Fix before posting: ${esc(r.problems.join('; '))}</p>` : ''}
</article>`).join('\n');
  const skipped = rep.skipped.map((s) => `<li>${esc(s.platform)} ${esc(s.id)}: ${esc(s.why)}</li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lead shortlist ${esc(date)}</title>
<style>:root{--bg:#fff;--fg:#1a1a1a;--mut:#666;--card:#f6f6f4;--line:#ddd;--acc:#0b5cff;--warn:#b42318}
@media (prefers-color-scheme:dark){:root{--bg:#121212;--fg:#eee;--mut:#aaa;--card:#1c1c1c;--line:#333;--acc:#7aa7ff;--warn:#ff8a80}}
body{background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif;max-width:760px;margin:0 auto;padding:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;margin:14px 0}
h2{font-size:1.05rem;margin:.3rem 0}a{color:var(--acc)}.meta,.note{color:var(--mut);font-size:.85rem}.tag{background:var(--line);padding:1px 8px;border-radius:99px}
.reply{white-space:pre-wrap;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px;font:inherit}
button{background:var(--acc);color:#fff;border:0;border-radius:8px;padding:8px 14px;font:inherit;cursor:pointer}.warn{color:var(--warn)}</style></head><body>
<h1>Lead shortlist, ${esc(date)}</h1><p>${rep.kept} conversations worth a reply out of ${rep.total} found. You post everything by hand; nothing here was sent.</p>
${cards}<details><summary>Skipped (${rep.skipped.length})</summary><ul>${skipped}</ul></details>
<script>function copyReply(i,b){var t=document.getElementById('r'+i).innerText;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent='Copied'},function(){b.textContent='Select and copy'})}</script></body></html>`;
}

function readJson(f, fallback) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; } }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
  const date = arg('run', new Date().toISOString().slice(0, 10));
  const dir = path.join(here, 'runs', date);
  if (!fs.existsSync(dir)) { console.error(`No run folder: ${dir}`); process.exit(1); }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const items = []; const drafts = {};
  for (const f of files) {
    if (f.startsWith('drafts-')) Object.assign(drafts, readJson(path.join(dir, f), {}));
    else if (!['report.json', 'summary.json'].includes(f)) items.push(...(readJson(path.join(dir, f), [])));
  }
  const rep = buildReport({ items, drafts, top: Number(arg('top', 25)), maxAgeDays: Number(arg('max-age', 7)) });
  fs.writeFileSync(path.join(dir, 'report.md'), renderMarkdown(rep, date));
  fs.writeFileSync(path.join(dir, 'report.html'), renderHtml(rep, date));
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(rep, null, 2));
  console.log(`${date}: ${rep.total} found, ${rep.kept} kept, ${rep.shortlist.length} on the shortlist, ${rep.skipped.length} skipped. ${path.join(dir, 'report.md')}`);
}
