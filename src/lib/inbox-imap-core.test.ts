import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FakeImapServer, rawMessage } from './test-support/fake-imap-server.ts';
import { pollMailbox, uidValidityProblem, type UidValidityReset, resolveImapConfig, parseReply, stripQuotedReply, isAutoReply, extractCandidateMessageIds, type PollDeps, type ImapConfig } from './inbox-imap-core.ts';
import { autoReplyClassification, parseValidDate, parseModelClassification, fallbackClassification } from './ai/inbox-rules.ts';

// ---------- config ----------

test('no user or app password means no poll', () => {
  assert.equal(resolveImapConfig({}), null);
  assert.equal(resolveImapConfig({ AR_DUNNING_IMAP_USER: 'a@b.test' }), null);
  assert.equal(resolveImapConfig({ AR_DUNNING_IMAP_USER: 'a@b.test', AR_DUNNING_IMAP_APP_PASSWORD: '  ' }), null);
});

test('defaults are Zoho over implicit TLS; host, port and mailbox are optional', () => {
  const c = resolveImapConfig({ AR_DUNNING_IMAP_USER: 'a@b.test', AR_DUNNING_IMAP_APP_PASSWORD: 'x' })!;
  assert.deepEqual([c.host, c.port, c.secure, c.mailbox], ['imap.zoho.com', 993, true, 'INBOX']);
  const g = resolveImapConfig({ AR_DUNNING_IMAP_USER: 'a@b.test', AR_DUNNING_IMAP_APP_PASSWORD: 'x', AR_DUNNING_IMAP_HOST: 'imap.gmail.com', AR_DUNNING_IMAP_MAILBOX: 'Replies' })!;
  assert.deepEqual([g.host, g.port, g.mailbox], ['imap.gmail.com', 993, 'Replies']);
});

test('TLS can only be switched off explicitly, and a bad port falls back', () => {
  const base = { AR_DUNNING_IMAP_USER: 'a@b.test', AR_DUNNING_IMAP_APP_PASSWORD: 'x' };
  const off = resolveImapConfig({ ...base, AR_DUNNING_IMAP_TLS: 'off', AR_DUNNING_IMAP_PORT: '1143' })!;
  assert.deepEqual([off.secure, off.plainOnly, off.port], [false, true, 1143]);
  assert.equal(resolveImapConfig({ ...base, AR_DUNNING_IMAP_TLS: 'false' })!.secure, true);
  assert.equal(resolveImapConfig({ ...base, AR_DUNNING_IMAP_PORT: 'abc' })!.port, 993);
});

// ---------- parsing ----------

test('message ids come from In-Reply-To and References, trimmed and de-duplicated', () => {
  assert.deepEqual(extractCandidateMessageIds({ inReplyTo: '<a@x>', references: ['<a@x>', ' <b@x> '] }), ['<a@x>', '<b@x>']);
  assert.deepEqual(extractCandidateMessageIds({ inReplyTo: undefined, references: '<a@x> <b@x>' as unknown as string[] }), ['<a@x>', '<b@x>']);
  assert.deepEqual(extractCandidateMessageIds({ inReplyTo: undefined, references: undefined }), []);
});

test('quoted original, lead-in and signature are removed', () => {
  assert.equal(stripQuotedReply('We will pay Friday.\n\nOn Thu, 2 Oct 2026 at 9:00, Acme <ar@acme.test> wrote:\n> Invoice 12 is due\n> please pay'), 'We will pay Friday.');
  assert.equal(stripQuotedReply('Paid last week.\n> Invoice 12'), 'Paid last week.');
  assert.equal(stripQuotedReply('Thanks\n-- \nSam Lee\nAP team'), 'Thanks');
  assert.equal(stripQuotedReply('Please resend.\n\nFrom: Acme\nSent: Thursday\nTo: me\nInvoice 12'), 'Please resend.');
  assert.equal(stripQuotedReply('Ok\n-----Original Message-----\nold stuff'), 'Ok');
  assert.equal(stripQuotedReply('Will pay Friday.\nOn Thu, 2 Oct 2026 at 9:00, Acme <ar@acme.test>\nwrote:\n> hi'), 'Will pay Friday.', 'lead-in wrapped over two lines');
});

test('a reply that is only quoted text keeps the full text instead of going empty', () => {
  assert.equal(stripQuotedReply('> everything is quoted'), '> everything is quoted');
});

test('auto replies and bounces are detected, normal mail is not', () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] });
  assert.equal(isAutoReply(h({ 'auto-submitted': 'auto-replied' }), 'a@x.test', 'Re: x'), true);
  assert.equal(isAutoReply(h({ 'auto-submitted': 'no' }), 'a@x.test', 'Re: x'), false);
  assert.equal(isAutoReply(h({ precedence: 'bulk' }), 'a@x.test', 'Re: x'), true);
  assert.equal(isAutoReply(h({}), 'MAILER-DAEMON@mx.test', 'Re: x'), true);
  assert.equal(isAutoReply(h({}), 'a@x.test', 'Automatic reply: Invoice 12'), true);
  assert.equal(isAutoReply(h({}), 'a@x.test', 'Out of Office'), true);
  assert.equal(isAutoReply(h({}), 'a@x.test', 'Undeliverable: Invoice 12'), true);
  assert.equal(isAutoReply(h({}), 'sam@x.test', 'Re: Invoice 12 is out of office coverage question'), false);
});

test('parseReply handles html-only mail, encoded subjects and missing From', async () => {
  const html = ['From: =?utf-8?Q?Jos=C3=A9_P?= <jose@cust.test>', 'To: r@x.test', 'Subject: =?utf-8?Q?Re=3A_Factura_=E2=82=AC40?=', 'Message-ID: <h1@cust.test>', 'In-Reply-To: <orig@mugavi.test>', 'MIME-Version: 1.0', 'Content-Type: text/html; charset=utf-8', '', '<div>Will pay <b>Friday</b><br>Thanks &amp; regards</div>'].join('\r\n');
  const r = await parseReply(Buffer.from(html));
  assert.equal(r.fromAddress, 'jose@cust.test');
  assert.equal(r.fromName, 'José P');
  assert.equal(r.subject, 'Re: Factura €40');
  assert.equal(r.body, 'Will pay Friday\nThanks & regards');
  assert.deepEqual(r.candidateIds, ['<orig@mugavi.test>']);
  const none = await parseReply(Buffer.from('Subject: hi\r\n\r\nbody'));
  assert.equal(none.fromAddress, '');
  assert.deepEqual(none.candidateIds, []);
});

// ---------- classification helpers ----------

test('model dates: only real YYYY-MM-DD calendar dates survive', () => {
  assert.equal(parseValidDate('2026-10-17')?.toISOString().slice(0, 10), '2026-10-17');
  assert.equal(parseValidDate('2026-10-17T00:00:00Z')?.toISOString().slice(0, 10), '2026-10-17');
  for (const bad of ['ASAP', 'next Friday', '', null, undefined, '2026-02-31', '2026-13-01', '10/17/2026']) assert.equal(parseValidDate(bad as string), null, String(bad));
});

test('model JSON must match the agreed shape and enum', () => {
  const ok = parseModelClassification(JSON.stringify({ classification: 'will_pay_date', confidence: 0.9, summary: 's', recommendedAction: 'a', suggestedPromiseDate: '2026-10-17' }));
  assert.equal(ok.classification, 'will_pay_date');
  assert.throws(() => parseModelClassification(JSON.stringify({ classification: 'paid_maybe', confidence: 1, summary: 's', recommendedAction: 'a', suggestedPromiseDate: null })));
  assert.throws(() => parseModelClassification(JSON.stringify({ classification: 'disputed', confidence: 1.5, summary: 's', recommendedAction: 'a', suggestedPromiseDate: null })));
  assert.throws(() => parseModelClassification('not json'));
});

test('fallback and auto-reply classifications are safe values', () => {
  assert.deepEqual([fallbackClassification('x'.repeat(500)).classification, fallbackClassification('x'.repeat(500)).summary.length], ['unclassified', 200]);
  const a = autoReplyClassification('I am away until Monday.');
  assert.deepEqual([a.classification, a.suggestedPromiseDate], ['no_action', null]);
  assert.match(a.summary, /away until Monday/);
  assert.match(autoReplyClassification('').summary, /no text/);
});

// ---------- end to end against the stand-in IMAP server ----------

const srv = new FakeImapServer();
before(() => srv.start());
after(() => srv.stop());

const ORIG = '<run-1@send.mugavi.test>';
const COPY = '<copy-1@send.mugavi.test>';
const INVOICES: Record<string, string> = { [ORIG]: 'inv_1', [COPY]: 'inv_2' };

function harness(over: Partial<PollDeps> = {}) {
  const state = { cursor: null as number | null, handled: [] as { invoiceId: string; body: string; subject: string; autoReply: boolean; fromAddress: string }[] };
  const deps: PollDeps = {
    getCursor: async () => state.cursor,
    setCursor: async (n) => { state.cursor = n; },
    findInvoiceId: async (ids) => { const k = ids.find((i) => INVOICES[i]); return k ? INVOICES[k] : null; },
    handleReply: async (r) => { state.handled.push({ invoiceId: r.invoiceId, body: r.body, subject: r.subject, autoReply: r.autoReply, fromAddress: r.fromAddress }); return { handled: true }; },
    ...over,
  };
  return { state, deps };
}
const cfg = (): ImapConfig => ({ host: '127.0.0.1', port: srv.port, secure: false, plainOnly: true, user: srv.user, pass: srv.password, mailbox: 'INBOX' });

test('end to end: bootstrap, then only new threaded replies are processed, read-only', async () => {
  // History that must never be processed.
  srv.deliver(rawMessage({ from: 'Old <old@cust.test>', subject: 'Re: old', body: 'ancient reply', inReplyTo: ORIG }));
  const h = harness();

  const first = await pollMailbox(cfg(), h.deps);
  assert.deepEqual(first, { scanned: 0, matched: 0, errors: 0 });
  assert.equal(h.state.cursor, 1, 'cursor sits at the end of the mailbox');
  assert.equal(h.state.handled.length, 0, 'history is not processed');

  srv.deliver(rawMessage({ from: 'Sam Lee <sam@cust.test>', subject: 'Re: Invoice 12', body: 'We will pay on 17 Oct.\n\nOn Thu, Acme wrote:\n> Invoice 12 is overdue', inReplyTo: ORIG, references: `<x@y> ${ORIG}` }));
  srv.deliver(rawMessage({ from: 'News <news@list.test>', subject: 'Weekly digest', body: 'unrelated, no thread headers' }));
  srv.deliver(rawMessage({ from: 'Pat <pat@cust.test>', subject: 'Re: Reminder', body: 'Paid already.', inReplyTo: '<someone-elses-thread@z>' }));
  srv.deliver(rawMessage({ from: 'Cc Person <cc@cust.test>', subject: 'Re: Invoice 12', body: 'Forwarded to AP.', inReplyTo: COPY }));
  srv.deliver(rawMessage({ from: 'MAILER-DAEMON@mx.test', subject: 'Undeliverable: Invoice 12', body: 'Delivery failed.', references: ORIG }));

  const second = await pollMailbox(cfg(), h.deps);
  assert.deepEqual(second, { scanned: 5, matched: 3, errors: 0 });
  assert.equal(h.state.cursor, 6);
  assert.deepEqual(h.state.handled.map((x) => [x.invoiceId, x.body, x.autoReply]), [
    ['inv_1', 'We will pay on 17 Oct.', false],
    ['inv_2', 'Forwarded to AP.', false],
    ['inv_1', 'Delivery failed.', true],
  ]);
  assert.equal(h.state.handled[0].fromAddress, 'sam@cust.test');

  // Nothing new: no fetch, nothing reprocessed (and "n:*" returning the newest message must not leak through).
  const third = await pollMailbox(cfg(), h.deps);
  assert.deepEqual(third, { scanned: 0, matched: 0, errors: 0 });
  assert.equal(h.state.handled.length, 3);

  // Never wrote to the mailbox.
  const writes = srv.commands.filter((c) => /^(STORE|SELECT|EXPUNGE|APPEND|COPY|MOVE|DELETE|CREATE)\b/.test(c));
  assert.deepEqual(writes, []);
  assert.ok(srv.commands.some((c) => c.startsWith('EXAMINE')), 'opened read-only');
  assert.ok(!srv.commands.some((c) => /^UID STORE/i.test(c)));
});

test('a storage failure stops the cursor so the message is retried, not lost', async () => {
  const h = harness();
  h.state.cursor = srv.uidNext - 1;
  const u1 = srv.deliver(rawMessage({ from: 'a@cust.test', subject: 'Re: 1', body: 'first', inReplyTo: ORIG }));
  const u2 = srv.deliver(rawMessage({ from: 'b@cust.test', subject: 'Re: 2', body: 'second', inReplyTo: ORIG }));
  let fail = true;
  const flaky = harness({
    getCursor: async () => h.state.cursor,
    setCursor: async (n) => { h.state.cursor = n; },
    handleReply: async (r) => { if (fail && r.body === 'second') throw new Error('db down'); h.state.handled.push({ invoiceId: r.invoiceId, body: r.body, subject: r.subject, autoReply: r.autoReply, fromAddress: r.fromAddress }); return { handled: true }; },
  });
  const a = await pollMailbox(cfg(), flaky.deps);
  assert.deepEqual([a.matched, a.errors, h.state.cursor], [1, 1, u1]);
  fail = false;
  const b = await pollMailbox(cfg(), flaky.deps);
  assert.deepEqual([b.matched, b.errors, h.state.cursor], [1, 0, u2]);
  assert.deepEqual(h.state.handled.map((x) => x.body), ['first', 'second']);
});

test('wrong app password fails to connect and writes nothing', async () => {
  const h = harness();
  await assert.rejects(pollMailbox({ ...cfg(), pass: 'wrong' }, h.deps));
  assert.equal(h.state.cursor, null);
});

// ---------- UIDVALIDITY ----------

test('uidValidityProblem: only a real change or an impossible cursor is a problem', () => {
  assert.equal(uidValidityProblem({ stored: 1, current: 1, lastUid: 5, uidNext: 6 }), null);
  assert.equal(uidValidityProblem({ stored: null, current: 7, lastUid: 5, uidNext: 6 }), null, 'never recorded: just remember it');
  assert.match(uidValidityProblem({ stored: 1, current: 2, lastUid: 5, uidNext: 6 }) ?? '', /changed from 1 to 2/);
  assert.match(uidValidityProblem({ stored: null, current: 2, lastUid: 50, uidNext: 6 }) ?? '', /ahead of the mailbox/);
});

test('UIDVALIDITY change: cursor resets to the end, nothing re-imported, reason recorded', async () => {
  const s2 = new FakeImapServer();
  await s2.start();
  try {
    const c: ImapConfig = { host: '127.0.0.1', port: s2.port, secure: false, plainOnly: true, user: s2.user, pass: s2.password, mailbox: 'INBOX' };
    const state = { cursor: null as number | null, validity: null as number | null, resets: [] as UidValidityReset[], handled: [] as string[], known: new Set<string>() };
    const deps: PollDeps = {
      getCursor: async () => state.cursor,
      setCursor: async (n) => { state.cursor = n; },
      getUidValidity: async () => state.validity,
      recordUidValidity: async (v, reset) => { state.validity = v; if (reset) state.resets.push(reset); },
      isKnownMessageId: async (id) => state.known.has(id),
      findInvoiceId: async () => 'inv_1',
      handleReply: async (r) => { state.handled.push(r.body); if (r.messageId) state.known.add(r.messageId); return { handled: true }; },
    };
    s2.deliver(rawMessage({ from: 'a@c.test', subject: 'Re: old', body: 'old one', inReplyTo: ORIG, messageId: '<old@c>' }));
    await pollMailbox(c, deps);
    assert.deepEqual([state.cursor, state.validity], [1, 1]);
    s2.deliver(rawMessage({ from: 'a@c.test', subject: 'Re: x', body: 'handled once', inReplyTo: ORIG, messageId: '<one@c>' }));
    const r1 = await pollMailbox(c, deps);
    assert.equal(r1.matched, 1);
    assert.equal(state.cursor, 2);

    // The server renumbers: same mail, new UIDVALIDITY. Old code would re-read or skip by stale UID.
    s2.renumber(99);
    s2.deliver(rawMessage({ from: 'b@c.test', subject: 'Re: y', body: 'arrived during the gap', inReplyTo: ORIG, messageId: '<gap@c>' }));
    const r2 = await pollMailbox(c, deps);
    assert.match(r2.uidValidityReset ?? '', /changed from 1 to 99/);
    assert.equal(r2.scanned, 0, 'nothing re-imported');
    assert.deepEqual(state.handled, ['handled once']);
    assert.equal(state.cursor, 3, 'cursor at the end of the renumbered mailbox');
    assert.equal(state.validity, 99);
    assert.equal(state.resets.length, 1);
    assert.deepEqual([state.resets[0].oldCursor, state.resets[0].newCursor, state.resets[0].oldValidity], [2, 3, 1]);

    // Normal service resumes, and a repeat of an already filed Message-ID is skipped.
    s2.deliver(rawMessage({ from: 'a@c.test', subject: 'Re: x again', body: 'dup', inReplyTo: ORIG, messageId: '<one@c>' }));
    s2.deliver(rawMessage({ from: 'a@c.test', subject: 'Re: z', body: 'fresh', inReplyTo: ORIG, messageId: '<fresh@c>' }));
    const r3 = await pollMailbox(c, deps);
    assert.equal(r3.uidValidityReset, undefined);
    assert.deepEqual([r3.scanned, r3.matched], [2, 1]);
    assert.deepEqual(state.handled, ['handled once', 'fresh']);
  } finally {
    await s2.stop();
  }
});

test('first poll after the feature ships records UIDVALIDITY without touching the cursor', async () => {
  const h = harness();
  h.state.cursor = srv.uidNext - 1;
  let recorded: number | null = null;
  const r = await pollMailbox(cfg(), { ...h.deps, getUidValidity: async () => null, recordUidValidity: async (v) => { recorded = v; } });
  assert.equal(r.uidValidityReset, undefined);
  assert.equal(recorded, 1);
});
