import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replySubject, cleanReplyBody, replyTarget, textToHtml, renderReplyHtml, MAX_REPLY_CHARS } from './inbox-reply.ts';

test('subject gets one Re:, never two', () => {
  assert.equal(replySubject('Invoice INV-1'), 'Re: Invoice INV-1');
  assert.equal(replySubject('Re: Invoice INV-1'), 'Re: Invoice INV-1');
  assert.equal(replySubject('RE: hello'), 'RE: hello');
  assert.equal(replySubject(null), 'Re: your message');
  assert.equal(replySubject('a\r\nb'), 'Re: a b', 'no header injection through a newline');
});

test('body is cleaned, capped, and empty means nothing to send', () => {
  assert.equal(cleanReplyBody('  Hi\r\nthere  '), 'Hi\nthere');
  assert.equal(cleanReplyBody('   \n '), null);
  assert.equal(cleanReplyBody(42), null);
  assert.equal(cleanReplyBody('x'.repeat(MAX_REPLY_CHARS + 50))?.length, MAX_REPLY_CHARS);
  assert.equal(cleanReplyBody('a\u0000b'), 'ab');
});

test('who the reply goes to', () => {
  assert.deepEqual(replyTarget({ fromAddress: 'ap@x.example', customerEmail: 'other@x.example', unsubscribedAt: null }), { ok: true, to: 'ap@x.example' });
  assert.deepEqual(replyTarget({ fromAddress: null, customerEmail: 'other@x.example', unsubscribedAt: null }), { ok: true, to: 'other@x.example' });
  assert.deepEqual(replyTarget({ fromAddress: 'not an address', customerEmail: 'other@x.example', unsubscribedAt: null }), { ok: true, to: 'other@x.example' });
  assert.equal(replyTarget({ fromAddress: null, customerEmail: null, unsubscribedAt: null }).ok, false);
});

test('an unsubscribed customer is never replied to, even if they wrote in', () => {
  const r = replyTarget({ fromAddress: 'ap@x.example', customerEmail: 'ap@x.example', unsubscribedAt: new Date() });
  assert.equal(r.ok, false);
  assert.match(r.ok ? '' : r.reason, /unsubscribed/);
});

test('html is escaped, paragraphs and line breaks survive', () => {
  const h = textToHtml('Hi <b>Sam</b> & co\nsecond line\n\nNew paragraph "quoted"');
  assert.doesNotMatch(h, /<b>/);
  assert.match(h, /&lt;b&gt;Sam&lt;\/b&gt; &amp; co<br>second line/);
  assert.equal((h.match(/<p /g) ?? []).length, 2);
  assert.match(h, /&quot;quoted&quot;/);
});

test('the original message is quoted, escaped and capped', () => {
  const h = renderReplyHtml({ body: 'Thanks, noted.', quotedFrom: 'Sam <sam@x.example>', quoted: '<script>x</script>\n' + 'y'.repeat(3000) });
  assert.match(h, /Sam &lt;sam@x\.example&gt; wrote:/);
  assert.doesNotMatch(h, /<script>/);
  assert.ok(h.length < 3000 + 1200);
  assert.doesNotMatch(renderReplyHtml({ body: 'Hi' }), /blockquote/);
});
