import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKey, encryptSecret, decryptSecret, isEncrypted } from './secret-box.ts';

const KEY = parseKey('a'.repeat(64))!;
const OTHER = parseKey('b'.repeat(64))!;

test('a value round-trips and is not stored readable', () => {
  const enc = encryptSecret('refresh-token-123', KEY);
  assert.ok(isEncrypted(enc));
  assert.equal(enc.includes('refresh-token-123'), false);
  assert.equal(decryptSecret(enc, KEY), 'refresh-token-123');
});

test('every encryption of the same value is different', () => {
  assert.notEqual(encryptSecret('same', KEY), encryptSecret('same', KEY));
});

test('with no key, values pass through unchanged both ways', () => {
  assert.equal(encryptSecret('plain', null), 'plain');
  assert.equal(decryptSecret('plain', null), 'plain');
});

test('an old plain value still reads when a key is set', () => {
  assert.equal(decryptSecret('old-plain-token', KEY), 'old-plain-token');
});

test('encrypting an already encrypted value does nothing', () => {
  const enc = encryptSecret('x', KEY);
  assert.equal(encryptSecret(enc, KEY), enc);
});

test('the wrong key, a missing key and tampering all fail loudly', () => {
  const enc = encryptSecret('secret', KEY);
  assert.throws(() => decryptSecret(enc, OTHER), /wrong or the value was changed/);
  assert.throws(() => decryptSecret(enc, null), /not set/);
  const bytes = Buffer.from(enc.slice('enc:v1:'.length), 'base64'); bytes[bytes.length - 1] ^= 1;
  assert.throws(() => decryptSecret('enc:v1:' + bytes.toString('base64'), KEY), /could not be decrypted/);
  assert.throws(() => decryptSecret('enc:v1:AAAA', KEY), /damaged/);
});

test('the key may be hex or base64, must be 32 bytes, and unset means no key', () => {
  assert.equal(parseKey(undefined), null);
  assert.equal(parseKey('  '), null);
  assert.equal(parseKey(Buffer.alloc(32, 7).toString('base64'))!.length, 32);
  assert.throws(() => parseKey('tooshort'), /32 bytes/);
});

test('unicode and long values survive', () => {
  const v = 'tok-é-✓-' + 'x'.repeat(5000);
  assert.equal(decryptSecret(encryptSecret(v, KEY), KEY), v);
});
