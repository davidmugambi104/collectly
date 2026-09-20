/**
 * Parse and validate a JSON request body without throwing.
 *
 * Nine routes called `schema.parse(await req.json())` outside any try/catch.
 * Zod's `.parse()` throws, so a malformed payload became an unhandled
 * ZodError and the caller got a 500 with an empty body:
 *
 *   /api/dunning/preview, /api/dunning/send, /api/dunning/test,
 *   /api/invoices, /api/invoices/mark-paid, /api/invoices/write-off,
 *   /api/lead-notify, /api/playbook/download, /api/unsubscribe
 *
 * Three of those are public, so anyone could generate 500s at will -- which
 * buries real faults in error monitoring under noise that is really a client
 * error.
 *
 * The routes that did catch returned `e.message`, which for a ZodError is the
 * entire issue array serialised as JSON. That is unreadable to a human and
 * tells an anonymous caller more about the schema than it needs to. This names
 * the offending fields and nothing else.
 */
import { NextResponse } from 'next/server';
import type { ZodType, output as ZodOutput } from 'zod';
import { invalidFields } from '@/lib/invalid-fields';

export { invalidFields };

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

// Generic over the SCHEMA, not its type parameter, so the result is z.output<S>.
// Typing this as ZodType<T> inferred T from the schema's INPUT type, which drops
// .default() -- a field with a default is optional going in and guaranteed
// coming out, and the input view made it `| undefined` at every call site.
export async function parseJsonBody<S extends ZodType>(
  req: Request,
  schema: S,
): Promise<ParsedBody<ZodOutput<S>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: badRequest('Request body must be valid JSON.') };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, response: badRequest(`Invalid or missing: ${invalidFields(result.error.issues).join(', ')}`) };
  }
  return { ok: true, data: result.data };
}
