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
// Stand-ins for the new cases: a voided invoice (found by id, Balance 0, PrivateNote Voided), a deleted one
// (absent from queries; the direct read answers Fault 610), one the direct read fails on with a 500, and a
// company whose home currency is GBP (no CurrencyRef on its invoice).
byId['vq1'] = { Id: 'vq1', DocNumber: 'V1', CustomerRef: { value: 'c1' }, TotalAmt: 0, Balance: 0, DueDate: '2026-07-01', TxnDate: '2026-06-01', PrivateNote: 'Voided' };
byId['gbp1'] = { Id: 'gbp1', DocNumber: 'G1', CustomerRef: { value: 'c1' }, TotalAmt: 80, Balance: 80, DueDate: '2026-07-01', TxnDate: '2026-06-01' };
open.push({ Id: 'gbp1', DocNumber: 'G1', CustomerRef: { value: 'c1', name: 'Cust 1' }, TotalAmt: 80, Balance: 80, DueDate: '2026-07-01', TxnDate: '2026-06-01' } as any);
let homeCurrency: string | null = 'GBP'; // null: Preferences read fails, falls back
let creditsDown = false;
let paymentsDown = false;
const payments = [{ Id: 'p1', CustomerRef: { value: 'c5' }, UnappliedAmt: 30, CurrencyRef: { value: 'USD' } }, { Id: 'p2', CustomerRef: { value: 'c7' }, UnappliedAmt: 75, CurrencyRef: { value: 'USD' } }, { Id: 'p3', CustomerRef: { value: 'c8' }, UnappliedAmt: 0, CurrencyRef: { value: 'USD' } }];
const memos = [{ Id: 'm1', CustomerRef: { value: 'c5' }, Balance: 150, CurrencyRef: { value: 'USD' } }, { Id: 'm2', CustomerRef: { value: 'c5' }, Balance: 250, CurrencyRef: { value: 'USD' } }, { Id: 'm3', CustomerRef: { value: 'c6' }, Balance: 0, CurrencyRef: { value: 'USD' } }];
const server = http.createServer((req, res) => {
  const u = new URL(req.url!, 'http://x'); const q = u.searchParams.get('query') ?? ''; calls.push(q.replace(/SELECT .* FROM/, 'SELECT * FROM').slice(0, 90));
  const send = (o: unknown) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  const start = Number(/STARTPOSITION (\d+)/.exec(q)?.[1] ?? 1); const max = Number(/MAXRESULTS (\d+)/.exec(q)?.[1] ?? 100);
  if (u.pathname.endsWith('/preferences')) { if (!homeCurrency) { res.writeHead(500); res.end('{}'); return; } return send({ Preferences: { CurrencyPrefs: { HomeCurrency: { value: homeCurrency }, MultiCurrencyEnabled: false } } }); }
  if (/\/companyinfo\//.test(u.pathname)) return send({ CompanyInfo: { CompanyName: 'Stand-in Co', Country: 'GB' } });
  const direct = /\/invoice\/([^/?]+)/.exec(u.pathname);
  if (direct) { const id = direct[1]; if (id === 'dq-flaky') { res.writeHead(500); res.end('{}'); return; } if (byId[id]) return send({ Invoice: byId[id] }); res.writeHead(400, { 'content-type': 'application/json' }); res.end(JSON.stringify({ Fault: { Error: [{ Message: 'Object Not Found', code: '610' }], type: 'ValidationFault' } })); return; }
  if (/FROM Payment/.test(q)) { if (paymentsDown) { res.writeHead(500); res.end('{}'); return; } return send({ QueryResponse: { Payment: payments.filter((m) => m.UnappliedAmt > 0).slice(start - 1, start - 1 + max) } }); }
  if (/FROM CreditMemo/.test(q)) { if (creditsDown) { res.writeHead(500); res.end('{}'); return; } return send({ QueryResponse: { CreditMemo: memos.filter((m) => m.Balance > 0).slice(start - 1, start - 1 + max) } }); }
  if (/FROM Customer/.test(q)) return send({ QueryResponse: { Customer: customers.slice(start - 1, start - 1 + max) } });
  if (/Id IN \(/.test(q)) { const ids = [...q.matchAll(/'([^']+)'/g)].map((m) => m[1]); return send({ QueryResponse: { Invoice: ids.map((i) => byId[i]).filter(Boolean) } }); }
  if (/FROM Invoice WHERE Balance/.test(q)) return send({ QueryResponse: { Invoice: open.slice(start - 1, start - 1 + max) } });
  res.writeHead(404); res.end('{}');
});

async function main() {
  await new Promise<void>((r) => server.listen(PORT, '127.0.0.1', () => r()));
  const { db } = await import('@/db'); const { ensureBootstrapped } = await import('@/lib/bootstrap-db');
  const { organizations, integrations, customers: ct, invoices } = await import('@/db/schema'); const customers_ = ct;
  const { syncQboForOrg } = await import('@/lib/integrations/quickbooks');
  await ensureBootstrapped();
  { const { sql } = await import('drizzle-orm'); const { DUNNING_CONTROL_DDL } = await import('@/lib/dunning-control-schema'); for (const stmt of DUNNING_CONTROL_DDL.filter((x: string) => x.includes('customer_credits'))) { await db.execute(sql.raw(stmt)); await db.execute(sql.raw(stmt)); } } // production DDL, run twice: must be idempotent
  const [org] = await db.select().from(organizations).limit(1);
  await db.delete(integrations).where(eq(integrations.orgId, org.id));
  await db.insert(integrations).values({ orgId: org.id, provider: 'quickbooks', status: 'connected', accessToken: 't', refreshToken: 'r', expiresAt: new Date(Date.now() + 86_400_000), realmId: 'R1' });
  const [cust] = await db.select().from(ct).where(eq(ct.orgId, org.id)).limit(1);
  const hold = (ext: string, number: string, status: any) => db.insert(invoices).values({ orgId: org.id, customerId: cust.id, externalId: ext, number, status, amount: '500', amountPaid: '0', currency: 'USD', issueDate: new Date('2026-06-01'), dueDate: new Date('2026-07-01') });
  await hold('pq1', 'PQ1', 'overdue'); await hold('vq1', 'V1', 'overdue'); await hold('dq1', 'D1', 'overdue'); await hold('dq-flaky', 'D2', 'overdue'); await hold('dq-disp', 'D3', 'disputed'); await hold('q5', 'Q-5', 'disputed'); await hold('q6', 'Q-6', 'written_off');
  const r = await syncQboForOrg(org.id);
  console.log('RESULT', JSON.stringify({ customers: r.customersUpserted, invoices: r.invoicesUpserted, errors: r.errors, truncated: r.truncated }));
  const st = async (e: string) => (await db.select({ s: invoices.status }).from(invoices).where(and(eq(invoices.orgId, org.id), eq(invoices.externalId, e))).limit(1))[0]?.s;
  for (const e of ['pq1', 'vq1', 'dq1', 'dq-flaky', 'dq-disp', 'q5', 'q6', 'q7', 'q2299', 'q1000', 'q1001']) console.log('STATUS', e, await st(e));
  console.log('CLOSED voided/deleted written off, flaky read left open:', JSON.stringify({ closed: r.invoicesClosed, voided: await st('vq1'), deleted: await st('dq1'), deletedDisputed: await st('dq-disp'), flakyStaysOpen: await st('dq-flaky'), flakyErrorReported: r.errors.some((e: string) => e.includes('dq-flaky')) }));
  console.log('CURRENCY missing CurrencyRef -> home currency:', (await db.select({ c: invoices.currency }).from(invoices).where(and(eq(invoices.orgId, org.id), eq(invoices.externalId, 'gbp1'))).limit(1))[0]?.c);
  console.log('CREDIT currency (stand-in memos have USD refs):', (await db.select({ c: (await import('@/db/schema')).customerCredits.currency }).from((await import('@/db/schema')).customerCredits).where(eq((await import('@/db/schema')).customerCredits.orgId, org.id)).limit(1))[0]?.c);
  const { customerCredits } = await import('@/db/schema');
  const credit = async () => (await db.select({ a: customerCredits.amount, cu: customerCredits.customerId }).from(customerCredits).where(eq(customerCredits.orgId, org.id))).map((c: { a: string }) => c.a).join(',');
  console.log('CREDITS after sync (expect memos 400 + unapplied payment 30 = 430.00 for c5, 75.00 for c7):', await credit());
  // The scheduler's real credit condition: c5 holds 400 and owes 300, so its invoice must be excluded; others must remain.
  { const { notCoveredByCredit } = await import('@/lib/dunning/credit-sql'); const { sql } = await import('drizzle-orm');
    const [c5] = await db.select().from(ct).where(and(eq(ct.orgId, org.id), eq(ct.externalId, 'c5'))).limit(1);
    await db.delete(invoices).where(eq(invoices.customerId, c5.id));
    await db.insert(invoices).values({ orgId: org.id, customerId: c5.id, externalId: 'x-own', number: 'X1', status: 'overdue', amount: '300', amountPaid: '0', currency: 'USD', issueDate: new Date(), dueDate: new Date(Date.now() - 864e5 * 10) });
    const kept = await db.select({ n: invoices.number, cust: customers_.externalId }).from(invoices).innerJoin(customers_, sql`${customers_.id} = ${invoices.customerId}`).where(and(eq(invoices.orgId, org.id), eq(invoices.status, 'overdue'), notCoveredByCredit));
    console.log('SCHEDULER credit rule: c5 invoice excluded =', !kept.some((k: { cust: string | null }) => k.cust === 'c5'), '| other overdue invoices kept =', kept.length); }
  paymentsDown = true;
  const rp = await syncQboForOrg(org.id);
  console.log('CREDITS after failed payments read (expect unchanged 430.00,75.00):', await credit(), '| errors:', rp.errors.filter((e: string) => e.startsWith('credit')).join(';').slice(0, 80));
  paymentsDown = false;
  creditsDown = true;
  const r2 = await syncQboForOrg(org.id);
  console.log('CREDITS after failed credit read (expect unchanged):', await credit(), '| errors:', r2.errors.filter((e: string) => e.startsWith('credit')).join(';').slice(0, 80));
  // Preferences unreadable: falls back to the CompanyInfo country (GB -> GBP), never silently USD for a UK company.
  homeCurrency = null; await db.delete(invoices).where(eq(invoices.externalId, 'gbp1')); await syncQboForOrg(org.id);
  console.log('CURRENCY with Preferences down (country fallback):', (await db.select({ c: invoices.currency }).from(invoices).where(and(eq(invoices.orgId, org.id), eq(invoices.externalId, 'gbp1'))).limit(1))[0]?.c);
  console.log('CALLS', calls.join('\nCALLS '));
  server.close(); process.exit(0);
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
