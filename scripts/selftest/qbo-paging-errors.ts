// Run: npx tsx scripts/selftest/qbo-paging-errors.ts   (also run by src/lib/integrations/quickbooks.standin.test.ts)
// Drives the real syncQboForOrg and qboListCredits against a local stand-in for the QuickBooks query API,
// in an in-memory database, and prints one JSON object of observations. Not a test of QuickBooks itself:
// real behaviour is checked by the sandbox plan in 34-qbo-sandbox-test-plan.md.
import http from 'node:http';
import { eq } from 'drizzle-orm';
process.env.USE_PGLITE = '1';
process.env.QBO_CLIENT_ID = 'id'; process.env.QBO_CLIENT_SECRET = 'secret';

type Row = Record<string, unknown>;
const customers: Row[] = Array.from({ length: 1001 }, (_, i) => ({ Id: `c${i}`, DisplayName: `Cust ${i}` }));
const open: Row[] = Array.from({ length: 2001 }, (_, i) => ({ Id: `q${i}`, DocNumber: `Q-${i}`, CustomerRef: { value: `c${i % 1001}` }, TotalAmt: 100, Balance: 100, DueDate: '2026-07-01', TxnDate: '2026-06-01', CurrencyRef: { value: 'USD' } }));
let payments: Row[] = [];
let memos: Row[] = [];
let queries: string[] = [];
// Behaviour switches, set per scenario.
const mode = { throttleFirst: 0, retryAfter: '', unauthorizedFirst: false, faultOn200: false, badRequest: false, failInvoicesFromPage2: false };
let oauthCalls = 0; let seenTokens: string[] = [];

const server = http.createServer((req, res) => {
  const u = new URL(req.url!, 'http://x'); const q = u.searchParams.get('query') ?? '';
  queries.push(q); seenTokens.push(String(req.headers.authorization));
  const send = (o: unknown, status = 200, h: Record<string, string> = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...h }); res.end(JSON.stringify(o)); };
  if (mode.throttleFirst > 0) { mode.throttleFirst--; return send({}, 429, mode.retryAfter ? { 'Retry-After': mode.retryAfter } : {}); }
  if (mode.unauthorizedFirst && req.headers.authorization === 'Bearer stale') return send({ fault: 'AuthenticationFailed' }, 401);
  if (mode.faultOn200) return send({ Fault: { Error: [{ Message: 'Something odd', code: '5000' }], type: 'SERVICE' } });
  if (mode.badRequest) return send({ Fault: { Error: [{ Message: 'QueryParserError' }], type: 'ValidationFault' } }, 400, { intuit_tid: 'tid-abc-123' });
  const start = Number(/STARTPOSITION (\d+)/.exec(q)?.[1] ?? 1); const max = Number(/MAXRESULTS (\d+)/.exec(q)?.[1] ?? 100);
  const page = (rows: Row[]) => rows.slice(start - 1, start - 1 + Math.min(max, 1000));
  if (/FROM Payment/.test(q)) return send({ QueryResponse: { Payment: page(payments) } });
  if (/FROM CreditMemo/.test(q)) return send({ QueryResponse: { CreditMemo: page(memos) } });
  if (/FROM Customer/.test(q)) return send({ QueryResponse: { Customer: page(customers) } });
  if (/FROM Invoice WHERE Balance/.test(q)) {
    if (mode.failInvoicesFromPage2 && start > 1) return send({ Fault: { Error: [{ Message: 'boom' }] } }, 500);
    return send({ QueryResponse: { Invoice: page(open) } });
  }
  send({ QueryResponse: {} });
});

const starts = (re: RegExp) => queries.filter((q) => re.test(q)).map((q) => Number(/STARTPOSITION (\d+)/.exec(q)?.[1] ?? 0));

async function main() {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  process.env.QBO_API_BASE = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`; // random port, set before quickbooks.ts is imported
  // Intercept only Intuit's token endpoint; everything else (the local stand-in) passes through.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).startsWith('https://oauth.platform.intuit.com')) { oauthCalls++; return new Response(JSON.stringify({ access_token: 'fresh', refresh_token: 'r2', expires_in: 3600 }), { status: 200 }); }
    return realFetch(input, init);
  }) as typeof fetch;
  const { db } = await import('@/db'); const { ensureBootstrapped } = await import('@/lib/bootstrap-db');
  const { organizations, integrations } = await import('@/db/schema');
  const { sql } = await import('drizzle-orm'); const { DUNNING_CONTROL_DDL } = await import('@/lib/dunning-control-schema');
  const { syncQboForOrg, qboListCredits } = await import('@/lib/integrations/quickbooks');
  await ensureBootstrapped();
  for (const stmt of DUNNING_CONTROL_DDL.filter((x: string) => x.includes('customer_credits'))) await db.execute(sql.raw(stmt));
  const [org] = await db.select().from(organizations).limit(1);
  const connect = async (token: string) => {
    await db.delete(integrations).where(eq(integrations.orgId, org.id));
    await db.insert(integrations).values({ orgId: org.id, provider: 'quickbooks', status: 'connected', accessToken: token, refreshToken: 'r', expiresAt: new Date(Date.now() + 86_400_000), realmId: 'R1' });
  };
  const reset = () => { queries = []; seenTokens = []; oauthCalls = 0; Object.assign(mode, { throttleFirst: 0, retryAfter: '', unauthorizedFirst: false, faultOn200: false, badRequest: false, failInvoicesFromPage2: false }); };
  const out: Record<string, unknown> = {};
  await connect('good');

  // 1. Paging: 2300 open invoices and 1500 customers.
  reset();
  const r1 = await syncQboForOrg(org.id);
  out.paging = { invoices: r1.invoicesUpserted, errors: r1.errors, truncated: r1.truncated, invoiceStarts: starts(/FROM Invoice WHERE Balance/), customerStarts: starts(/FROM Customer/), allOrdered: queries.filter((q) => /FROM (Invoice WHERE Balance|Customer|CreditMemo|Payment)/.test(q)).every((q) => /ORDERBY Id/.test(q) && /MAXRESULTS 1000/.test(q)) };

  customers.length = 3; open.length = 3; // later scenarios do not need the big lists

  // 2. Credits paging: 2100 unapplied payments and 3 memos; the first page has no STARTPOSITION 0, all are 1-based.
  reset();
  payments = Array.from({ length: 2100 }, (_, i) => ({ Id: `p${i}`, CustomerRef: { value: `c${i % 50}` }, UnappliedAmt: 1, CurrencyRef: { value: 'GBP' } }));
  memos = [{ Id: 'm1', CustomerRef: { value: 'c1' }, Balance: 10, CurrencyRef: { value: 'GBP' } }];
  const c = await qboListCredits(org.id);
  out.credits = { count: c.credits.length, total: c.credits.reduce((a, x) => a + x.amount, 0), truncated: c.truncated, paymentStarts: starts(/FROM Payment/), memoStarts: starts(/FROM CreditMemo/), currencies: [...new Set(c.credits.map((x) => x.currency))] };

  // 3. Credits cut off at the page limit: flagged truncated, and sync leaves stored credit alone.
  reset();
  memos = Array.from({ length: 10_000 }, (_, i) => ({ Id: `m${i}`, CustomerRef: { value: 'c1' }, Balance: 1, CurrencyRef: { value: 'USD' } }));
  const ct = await qboListCredits(org.id);
  const r3 = await syncQboForOrg(org.id);
  out.creditsTruncated = { truncated: ct.truncated, memoStarts: starts(/FROM CreditMemo/).slice(0, 3), memoQueryCount: starts(/FROM CreditMemo/).length, syncError: r3.errors.find((e) => e.startsWith('credit')) ?? null };
  memos = []; payments = [];

  // 4. Throttle: two 429s with Retry-After 1, then success. A 429 never gives up early (3 retries).
  reset(); mode.throttleFirst = 2; mode.retryAfter = '1';
  const t0 = Date.now(); const r4 = await syncQboForOrg(org.id);
  out.throttle = { ms: Date.now() - t0, customers: r4.customersUpserted, errors: r4.errors };
  //    Throttled beyond the retry budget (4 in a row): the sync records an error, does not throw.
  reset(); mode.throttleFirst = 1000; mode.retryAfter = '1';
  const r4b = await syncQboForOrg(org.id);
  out.throttleExhausted = { errors: r4b.errors.slice(0, 3).map((e) => e.slice(0, 60)), customersUpserted: r4b.customersUpserted };

  // 5. 401 with a stale token: refresh once, retry with the new token.
  reset(); await connect('stale'); mode.unauthorizedFirst = true;
  const r5 = await syncQboForOrg(org.id);
  out.unauthorized = { oauthCalls, usedFresh: seenTokens.includes('Bearer fresh'), customers: r5.customersUpserted, errors: r5.errors };

  // 6. Fault inside a 200 body: an error, never an empty clean result.
  reset(); await connect('good'); mode.faultOn200 = true;
  const r6 = await syncQboForOrg(org.id);
  out.faultOn200 = { errors: r6.errors.map((e) => e.slice(0, 40)), customersUpserted: r6.customersUpserted };

  // 7. 400 with a Fault and an intuit_tid header: the tid reaches the error text.
  reset(); mode.badRequest = true;
  const r7 = await syncQboForOrg(org.id);
  out.badRequest = { hasTid: r7.errors.some((e) => e.includes('intuit_tid tid-abc-123')), firstError: r7.errors[0]?.slice(0, 50) };

  // 8. A later page fails: the sync reports it and does not claim a clean result.
  reset(); mode.failInvoicesFromPage2 = true;
  for (let i = open.length; i < 1001; i++) open.push({ Id: `q${i}`, CustomerRef: { value: 'c1' }, TotalAmt: 1, Balance: 1 }); // a full first page, so a second page is asked for
  const r8 = await syncQboForOrg(org.id);
  out.laterPageFails = { errors: r8.errors.map((e) => e.slice(0, 20)) };

  console.log('RESULT ' + JSON.stringify(out));
  server.close(); process.exit(0);
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
