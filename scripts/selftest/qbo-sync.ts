// Run: npx tsx scripts/selftest/qbo-sync.ts
// Runs the real syncQboForOrg against a local stand-in for the QuickBooks query API (STARTPOSITION, MAXRESULTS, Id IN)
// in an in-memory database. Not a test of QuickBooks itself: it checks the sync logic.
import http from 'node:http';
import { and, eq } from 'drizzle-orm';
const PORT = 4818;
process.env.QBO_API_BASE = `http://127.0.0.1:${PORT}`;
process.env.USE_PGLITE = '1';
const customers = Array.from({ length: 1500 }, (_, i) => ({ Id: `c${i}`, DisplayName: `Cust ${i}`, PrimaryEmailAddr: { Address: `c${i}@example.test` } }));
const open = Array.from({ length: 2300 }, (_, i) => ({ Id: `q${i}`, DocNumber: `Q-${i}`, CustomerRef: { value: `c${i % 1500}`, name: `Cust ${i % 1500}` }, TotalAmt: 100, Balance: 100, DueDate: '2026-07-01', TxnDate: '2026-06-01', CurrencyRef: { value: 'USD' } }));
const byId: Record<string, any> = { 'pq1': { Id: 'pq1', DocNumber: 'PQ1', CustomerRef: { value: 'c1' }, TotalAmt: 500, Balance: 0, DueDate: '2026-07-01', TxnDate: '2026-06-01', CurrencyRef: { value: 'USD' } } };
const calls: string[] = [];
const server = http.createServer((req, res) => {
  const u = new URL(req.url!, 'http://x'); const q = u.searchParams.get('query') ?? ''; calls.push(q.replace(/SELECT .* FROM/, 'SELECT * FROM').slice(0, 90));
  const send = (o: unknown) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  const start = Number(/STARTPOSITION (\d+)/.exec(q)?.[1] ?? 1); const max = Number(/MAXRESULTS (\d+)/.exec(q)?.[1] ?? 100);
  if (/FROM Customer/.test(q)) return send({ QueryResponse: { Customer: customers.slice(start - 1, start - 1 + max) } });
  if (/Id IN \(/.test(q)) { const ids = [...q.matchAll(/'([^']+)'/g)].map((m) => m[1]); return send({ QueryResponse: { Invoice: ids.map((i) => byId[i]).filter(Boolean) } }); }
  if (/FROM Invoice WHERE Balance/.test(q)) return send({ QueryResponse: { Invoice: open.slice(start - 1, start - 1 + max) } });
  res.writeHead(404); res.end('{}');
});

async function main() {
  await new Promise<void>((r) => server.listen(PORT, '127.0.0.1', () => r()));
  const { db } = await import('@/db'); const { ensureBootstrapped } = await import('@/lib/bootstrap-db');
  const { organizations, integrations, customers: ct, invoices } = await import('@/db/schema');
  const { syncQboForOrg } = await import('@/lib/integrations/quickbooks');
  await ensureBootstrapped();
  const [org] = await db.select().from(organizations).limit(1);
  await db.delete(integrations).where(eq(integrations.orgId, org.id));
  await db.insert(integrations).values({ orgId: org.id, provider: 'quickbooks', status: 'connected', accessToken: 't', refreshToken: 'r', expiresAt: new Date(Date.now() + 86_400_000), realmId: 'R1' });
  const [cust] = await db.select().from(ct).where(eq(ct.orgId, org.id)).limit(1);
  const hold = (ext: string, number: string, status: any) => db.insert(invoices).values({ orgId: org.id, customerId: cust.id, externalId: ext, number, status, amount: '500', amountPaid: '0', currency: 'USD', issueDate: new Date('2026-06-01'), dueDate: new Date('2026-07-01') });
  await hold('pq1', 'PQ1', 'overdue'); await hold('q5', 'Q-5', 'disputed'); await hold('q6', 'Q-6', 'written_off');
  const r = await syncQboForOrg(org.id);
  console.log('RESULT', JSON.stringify({ customers: r.customersUpserted, invoices: r.invoicesUpserted, errors: r.errors, truncated: r.truncated }));
  const st = async (e: string) => (await db.select({ s: invoices.status }).from(invoices).where(and(eq(invoices.orgId, org.id), eq(invoices.externalId, e))).limit(1))[0]?.s;
  for (const e of ['pq1', 'q5', 'q6', 'q7', 'q2299', 'q1000', 'q1001']) console.log('STATUS', e, await st(e));
  console.log('CALLS', calls.join('\nCALLS '));
  server.close(); process.exit(0);
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
