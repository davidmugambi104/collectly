import { createHmac, timingSafeEqual } from 'node:crypto';

/** Constant-time string comparison. False for different lengths, without leaking where they differ. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Paystack signs the raw body with HMAC-SHA512 using the secret key and sends the hex digest in x-paystack-signature. */
export function paystackSignatureValid(body: string, signature: string | null, secret: string | undefined): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac('sha512', secret).update(body).digest('hex');
  return safeEqual(expected, signature.trim().toLowerCase());
}
