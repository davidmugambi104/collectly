/**
 * Encrypts secrets stored in the database (the access and refresh tokens for
 * Xero, QuickBooks and the other connections), so a database leak does not hand over
 * the keys to a customer's books.
 *
 * AES-256-GCM, a fresh random IV for every value, stored as `enc:v1:` + base64(iv | tag | ciphertext).
 * The key is INTEGRATION_TOKEN_KEY: 32 bytes, as 64 hex characters or base64.
 *
 *  - No key set: values pass through as they are today. Nothing breaks, nothing is protected.
 *  - Key set: new writes are encrypted. A value without the `enc:v1:` prefix is an old plain
 *    value and is returned as it is, so existing rows keep working and are encrypted the next
 *    time their token refreshes.
 *  - Key set but wrong or malformed: fail loudly. Quietly storing plaintext or returning
 *    garbage would be worse than an error the owner can fix by reconnecting.
 */
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const PREFIX = 'enc:v1:';

/** Parse the key. null when unset; throws when set but not 32 bytes. */
export function parseKey(raw: string | undefined | null): Buffer | null {
  const v = raw?.trim();
  if (!v) return null;
  const buf = /^[0-9a-fA-F]{64}$/.test(v) ? Buffer.from(v, 'hex') : Buffer.from(v, 'base64');
  if (buf.length !== 32) throw new Error('INTEGRATION_TOKEN_KEY must be 32 bytes, as 64 hex characters or base64.');
  return buf;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encryptSecret(plain: string, key: Buffer | null): string {
  if (!key) return plain;
  if (isEncrypted(plain)) return plain; // never double-encrypt
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

export function decryptSecret(value: string, key: Buffer | null): string {
  if (!isEncrypted(value)) return value; // an old plain value
  if (!key) throw new Error('A stored token is encrypted but INTEGRATION_TOKEN_KEY is not set.');
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
  if (raw.length < 12 + 16 + 1) throw new Error('A stored token is damaged and cannot be decrypted.');
  const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  try {
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('A stored token could not be decrypted: INTEGRATION_TOKEN_KEY is wrong or the value was changed.');
  }
}
