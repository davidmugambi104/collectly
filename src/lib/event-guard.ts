/**
 * The one place that decides what an analytics property may look like.
 *
 * Both the browser tracker (src/lib/track.ts, PostHog) and the server funnel
 * recorder (src/lib/funnel-events.ts, the `events` table) validate through
 * here, so the rule is the same on both sides: ids, enums, small integers and
 * booleans only. Never a customer name, an email, an amount, a subject line or
 * any invoice content.
 *
 * Two layers, on purpose:
 *  - the registry gives every event a closed list of keys and a type per key
 *    (so TypeScript rejects `{ email }` at compile time), and
 *  - a key-name denylist plus value shape checks run at runtime, so a value
 *    that got through a cast or came from untyped JSON is still dropped.
 */

export type PropSpec =
  | { kind: 'enum'; values: readonly string[]; optional?: true }
  | { kind: 'id'; optional?: true }
  | { kind: 'int'; optional?: true }
  | { kind: 'bool'; optional?: true }
  /** Short lowercase token such as a placement name: a-z, 0-9, _ and - only. */
  | { kind: 'token'; optional?: true }
  /** Fixed CTA copy that is written in our own source, never user input. */
  | { kind: 'copy'; optional?: true };

export const enumOf = <const V extends readonly string[]>(values: V): { kind: 'enum'; values: V } => ({ kind: 'enum', values });
export const id = { kind: 'id' } as const;
export const int = { kind: 'int' } as const;
export const bool = { kind: 'bool' } as const;
export const token = { kind: 'token' } as const;
export const copy = { kind: 'copy' } as const;
export const optional = <S extends PropSpec>(s: S): S & { optional: true } => ({ ...s, optional: true });

type Primitive<S extends PropSpec> = S extends { kind: 'enum'; values: infer V extends readonly string[] }
  ? V[number]
  : S extends { kind: 'int' }
    ? number
    : S extends { kind: 'bool' }
      ? boolean
      : string;

export type PropsOf<Shape extends Record<string, PropSpec>> = {
  [K in keyof Shape as Shape[K] extends { optional: true } ? never : K]: Primitive<Shape[K]>;
} & {
  [K in keyof Shape as Shape[K] extends { optional: true } ? K : never]?: Primitive<Shape[K]>;
};

/**
 * Words that mark a key as carrying personal or invoice content. Keys are split
 * into words on camelCase, underscores, dashes and dots, so `customerName`,
 * `customer_name` and `billing.email` all trip it while `customerId` does not.
 */
export const FORBIDDEN_KEY_WORDS: ReadonlySet<string> = new Set([
  'email', 'mail', 'name', 'firstname', 'lastname', 'fullname', 'phone', 'mobile', 'tel', 'sms',
  'amount', 'total', 'balance', 'price', 'sum', 'fee', 'currency',
  'subject', 'body', 'text', 'content', 'message', 'note', 'notes', 'description', 'comment', 'reason',
  'address', 'street', 'city', 'postcode', 'zip',
  'company', 'business', 'org', 'organisation', 'organization', 'customer', 'debtor', 'contact', 'recipient',
  'number', 'ref', 'reference', 'token', 'secret', 'password', 'key', 'ip',
]);

const ID_BLOCKERS: ReadonlySet<string> = new Set(['email', 'mail', 'name', 'phone', 'mobile', 'tel', 'address', 'password', 'secret', 'token']);

function words(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** True when the key name suggests personal or invoice content. */
export function isForbiddenKey(key: string): boolean {
  const w = words(key);
  if (w.length === 0) return true;
  // `customerId`, `invoice_id`, `orgId`: the noun in front is fine because the
  // value must pass the id-shape check. `emailId` or `nameId` still fail.
  const last = w[w.length - 1];
  if ((last === 'id' || last === 'ids') && w.length > 1) {
    return w.slice(0, -1).some((x) => ID_BLOCKERS.has(x));
  }
  return w.some((x) => FORBIDDEN_KEY_WORDS.has(x));
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const TOKEN_RE = /^[a-z0-9_-]{1,40}$/;

function valueOk(spec: PropSpec, v: unknown): boolean {
  switch (spec.kind) {
    case 'enum':
      return typeof v === 'string' && spec.values.includes(v);
    case 'id':
      // No "@" and no spaces: an email address or a name cannot pass as an id.
      return typeof v === 'string' && ID_RE.test(v);
    case 'int':
      return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1_000_000;
    case 'bool':
      return typeof v === 'boolean';
    case 'token':
      return typeof v === 'string' && TOKEN_RE.test(v);
    case 'copy':
      return typeof v === 'string' && v.length > 0 && v.length <= 40 && !/@|\d{3,}/.test(v);
  }
}

export type GuardResult = { props: Record<string, string | number | boolean>; problems: string[] };

/**
 * Check props against an event's shape. Returns only the props that passed and
 * a list of problems for the rest. Never throws: callers decide whether a
 * problem is fatal (tests, dev) or just a dropped key (production).
 */
export function guardProps(shape: Record<string, PropSpec>, input: Record<string, unknown> | undefined): GuardResult {
  const props: GuardResult['props'] = {};
  const problems: string[] = [];
  const given = input ?? {};
  for (const key of Object.keys(given)) {
    const value = given[key];
    if (value === undefined) continue;
    if (isForbiddenKey(key)) {
      problems.push(`key "${key}" looks like personal or invoice content`);
      continue;
    }
    const spec = shape[key];
    if (!spec) {
      problems.push(`key "${key}" is not part of this event`);
      continue;
    }
    if (!valueOk(spec, value)) {
      problems.push(`value for "${key}" does not match its ${spec.kind} shape`);
      continue;
    }
    props[key] = value as string | number | boolean;
  }
  for (const key of Object.keys(shape)) {
    if (!shape[key].optional && given[key] === undefined) problems.push(`missing required key "${key}"`);
  }
  return { props, problems };
}
