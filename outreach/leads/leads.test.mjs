import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excludeReason, scoreItem, ageDays } from './lib/score.mjs';
import { lintDraft } from './lib/lint.mjs';
import { buildReport } from './rank.mjs';

const now = new Date('2026-10-06T12:00:00Z');
const item = (o = {}) => ({ id: 'RD-a', platform: 'reddit', url: 'https://x/a', title: 'How do you chase overdue invoices from clients?', text: 'I am a bookkeeper on QuickBooks and my clients never pay on time. Any tips?', createdAt: '2026-10-05T12:00:00Z', score: 8, comments: 4, locked: false, ...o });

test('a bookkeeper asking about overdue invoices scores high', () => {
  const s = scoreItem(item(), { now });
  assert.ok(s.total >= 60, `got ${s.total}`);
  assert.equal(s.asking, 10);
});

test('same input gives the same score', () => {
  assert.deepEqual(scoreItem(item(), { now }), scoreItem(item(), { now }));
});

test('fresher and less crowded beats older and crowded', () => {
  const fresh = scoreItem(item({ comments: 5 }), { now }).total;
  const stale = scoreItem(item({ createdAt: '2026-10-01T12:00:00Z', comments: 80 }), { now }).total;
  assert.ok(fresh > stale);
});

test('locked, old, validation, promo, competitor and Kenya threads are excluded', () => {
  assert.match(excludeReason(item({ locked: true }), { now }), /locked/);
  assert.match(excludeReason(item({ createdAt: '2026-09-20T00:00:00Z' }), { now }), /older/);
  assert.match(excludeReason(item({ text: 'I built a tool to chase invoices, would you use it?' }), { now }), /validating/);
  assert.match(excludeReason(item({ text: 'check out my invoice tool, use my link' }), { now }), /promotion/);
  assert.match(excludeReason(item({ title: 'Chaser alternative', text: 'we built our app for late payment' }), { now }), /competitor/);
  assert.match(excludeReason(item({ text: 'late payment in Nairobi' }), { now }), /market/);
  assert.equal(excludeReason(item(), { now }), null);
  assert.match(excludeReason(item({ createdAt: 'garbage' }), { now }), /date/);
});

test('ageDays handles bad dates', () => { assert.equal(ageDays('nope', now), null); });

test('an old thread with a recent reply is kept; one with no recent reply is not', () => {
  const old = { createdAt: '2026-09-20T00:00:00Z' };
  assert.equal(excludeReason(item({ ...old, lastActiveAt: '2026-10-05T18:00:00Z' }), { now }), null);
  assert.match(excludeReason(item({ ...old, lastActiveAt: '2026-10-01T00:00:00Z' }), { now }), /older/);
  assert.match(excludeReason(item(old), { now }), /older/);
});

test('lint passes a plain draft and catches the usual problems', () => {
  const ok = { painPoint: 'owner hates chasing', reply: 'In practice I would send one reminder per customer each week that lists everything they owe, then stop the moment they reply or pay.' };
  assert.deepEqual(lintDraft(ok), []);
  assert.ok(lintDraft({ ...ok, reply: ok.reply + ' It is a game-changer — seamless.' }).length >= 2);
  assert.ok(lintDraft({ ...ok, reply: ok.reply + ' See https://mugavi.com' }).some((p) => /link/.test(p)));
  assert.ok(lintDraft({ ...ok, reply: ok.reply + ' Mugavi does this.' }).some((p) => /mentionsMugavi/.test(p)));
  assert.ok(lintDraft({ ...ok, mentionsMugavi: true, reply: ok.reply + ' Mugavi does this.' }).some((p) => /mentionReason/.test(p)));
  assert.deepEqual(lintDraft({ ...ok, mentionsMugavi: true, mentionReason: 'they asked for a tool', reply: ok.reply + ' I work on Mugavi, which drafts reminders and you approve each one.' }), []);
  assert.ok(lintDraft({ ...ok, mentionsMugavi: true, mentionReason: 'they asked for a tool', reply: ok.reply + ' Mugavi drafts reminders and you approve each one.' }).some((p) => /affiliated/.test(p)));
  assert.ok(lintDraft({ ...ok, reply: 'x'.repeat(300) }, { platform: 'x' }).some((p) => /too long/.test(p)));
  assert.ok(lintDraft({ painPoint: '', reply: ok.reply }).some((p) => /painPoint/.test(p)));
});

test('report drops duplicates and excluded items, ranks the rest and flags missing drafts', () => {
  const items = [item(), item({ id: 'RD-dup' }), item({ id: 'RD-b', url: 'https://x/b', locked: true }), item({ id: 'RD-c', url: 'https://x/c', title: 'Weather', text: 'sunny today' })];
  const rep = buildReport({ items, drafts: {}, now });
  assert.equal(rep.kept, 1);
  assert.equal(rep.skipped.length, 2);
  assert.deepEqual(rep.shortlist[0].problems, ['no draft written']);
});

import { mapPost, inWindow } from './sources/reddit-api.mjs';
import { mapTweet, QUERIES as XQ } from './sources/x-api.mjs';

test('reddit and x mappers keep no author and give usable links', () => {
  const p = mapPost({ data: { id: 'abc', permalink: '/r/Bookkeeping/comments/abc/x/', subreddit: 'Bookkeeping', title: 'T', selftext: 's'.repeat(900), created_utc: 1759708800, score: 3, num_comments: 2, author: 'someone', locked: false, archived: true } });
  assert.equal(p.id, 'RD-abc'); assert.equal(p.locked, true); assert.equal(p.text.length, 600); assert.ok(!('author' in p));
  const x = mapTweet({ id: '9', text: 'hello', created_at: '2026-10-05T00:00:00Z', public_metrics: { like_count: 2, retweet_count: 1, reply_count: 3 }, author_id: '5' });
  assert.equal(x.url, 'https://x.com/i/web/status/9'); assert.equal(x.score, 3); assert.equal(x.comments, 3); assert.ok(!('author_id' in x));
  assert.ok(XQ.every((q) => q.length < 512));
});

test('"not getting paid" style posts count as payment pain', () => {
  const s = scoreItem(item({ title: 'Not getting paid for an event', text: 'The organiser still has not paid and keeps saying next week.' }), { now });
  assert.ok(s.relevance >= 12, `got ${s.relevance}`);
  assert.equal(excludeReason(item({ title: 'Not getting paid for an event', text: 'He owes me 2k.' }), { now }), null);
});

test('inWindow keeps posts inside the day window and drops old or undated ones', () => {
  const n = new Date('2026-10-06T12:00:00Z');
  assert.equal(inWindow({ createdAt: '2026-10-05T12:00:00Z' }, 7, n), true);
  assert.equal(inWindow({ createdAt: '2026-09-28T12:00:00Z' }, 7, n), false);
  assert.equal(inWindow({ createdAt: 'nope' }, 7, n), false);
  assert.equal(inWindow({ createdAt: '2026-10-09T12:00:00Z' }, 7, n), false);
});
