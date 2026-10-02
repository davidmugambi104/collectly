// Run: npx tsx scripts/selftest/xero-sync.ts
// Runs the real syncXeroForOrg against a local stand-in for the Xero API (100 per page, page=N, IDs=a,b)
// in an in-memory database, and prints what it did. Not a test of Xero itself: it checks the sync logic.
import http from 'node:http';
import { and, eq } from 'drizzle-orm';

const PORT = 4817;
process.env.XERO_API_BASE = `http://127.0.0.1:${PORT}/api.xro/2.0`;
process.env.XERO_CONNECTIONS_URL = `http://127.0.0.1:${PORT}/Connections`;
process.env.USE_PGLITE = '1';

// ---- A fake Xero that follows the documented rules: 100 per page, page=N, IDs=a,b ----
const contacts = Array.from({ length: 250 }, (_, i) => ({ ContactID: `c${i}`, Name: `Customer ${i}`, EmailAddress: `c${i}@example.test` }));
const authorised = Array.from({ length: 230 }, (_, i) => ({
  InvoiceID: `a${i}`, InvoiceNumber: `INV-A${i}`, Status: 'AUTHORISED', Total: 100, AmountDue: 100, CurrencyCode: 'USD',
  Date: '/Date(1780000000000+0000)/', DueDate: '/Date(1782000000000+0000)/', Contact: { ContactID: `c${i % 250}`, Name: `Customer ${i % 250}` },
}));
// Xero-side truth for invoices that are NOT in the open list
const byId: Record<string, any> = {
  'paid-elsewhere': { InvoiceID: 'paid-elsewhere', InvoiceNumber: 'INV-P', Status: 'PAID', Total: 500, AmountDue: 0, CurrencyCode: 'USD', Date: '/Date(1780000000000+0000)/', DueDate: '/Date(1781000000000+0000)/', Contact: { ContactID: 'c1' } },
  'voided': { InvoiceID: 'voided', InvoiceNumber: 'INV-V', Status: 'VOIDED', Total: 500, AmountDue: 0, CurrencyCode: 'USD', Date: '/Date(1780000000000+0000)/', DueDate: '/Date(1781000000000+0000)/', Contact: { ContactID: 'c2' } },
  'dis-then-paid': { InvoiceID: 'dis-then-paid', InvoiceNumber: 'INV-DP', Status: 'PAID', Total: 500, AmountDue: 0, CurrencyCode: 'USD', Date: '/Date(1780000000000+0000)/', DueDate: '/Date(1781000000000+0000)/', Contact: { ContactID: 'c3' } },
};
const calls: string[] = [];
const revoked: string[] = [];
const notes = [{ CreditNoteID: 'n1', Status: 'AUTHORISED', RemainingCredit: 120.5, CurrencyCode: 'USD', Contact: { ContactID: 'c7' } }, { CreditNoteID: 'n2', Status: 'AUTHORISED', RemainingCredit: 79.5, CurrencyCode: 'USD', Contact: { ContactID: 'c7' } }, { CreditNoteID: 'n3', Status: 'AUTHORISED', RemainingCredit: 0, CurrencyCode: 'USD', Contact: { ContactID: 'c8' } }];
const server = http.createServer((req, res) => {
  const u = new URL(req.url!, `http://x`);
  calls.push(`${u.pathname}${u.search}`);
  const send = (o: unknown) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.method === 'DELETE' && u.pathname.startsWith('/Connections/')) { revoked.push(decodeURIComponent(u.pathname.split('/')[2])); res.writeHead(204); res.end(); return; }
  if (u.pathname === '/Connections') {
    const demo = { id: 'c-demo', tenantId: 'T2', tenantName: 'Demo Company (Global)', updatedDateUtc: '2026-10-02T01:00:00Z' };
    const mine = { id: 'c-mine', tenantId: 'T1', tenantName: 'mugavi', updatedDateUtc: '2026-10-02T00:00:00Z' };
    return send(u.searchParams.get('authEventId') === 'evt-mugavi' ? [mine] : [demo, mine]);
  }
  if (req.headers['xero-tenant-id'] !== 'T1') { res.writeHead(403); res.end('no tenant'); return; }
  const page = Number(u.searchParams.get('page') ?? 0);
  if (u.pathname.endsWith('/CreditNotes')) return send({ CreditNotes: notes.slice((page - 1) * 100, page * 100) });
  if (u.pathname.endsWith('/Contacts')) return send({ Contacts: page ? contacts.slice((page - 1) * 100, page * 100) : contacts.slice(0, 100) });
  if (u.pathname.endsWith('/Invoices')) {
    const ids = u.searchParams.get('IDs');
    if (ids) return send({ Invoices: ids.split(',').map((i) => byId[i]).filter(Boolean) });
    const where = u.searchParams.get('where') ?? '';
    if (where.includes('AUTHORISED')) return send({ Invoices: authorised.slice((page - 1) * 100, page * 100) });
    if (where.includes('PAID')) return send({ Invoices: [] });
  }
  res.writeHead(404); res.end('{}');
});

async function main() {
  await new Promise<void>((r) => server.listen(PORT, '127.0.0.1', () => r()));
  const { db } = await import('@/db');
  const { ensureBootstrapped } = await import('@/lib/bootstrap-db');
  const { organizations, integrations, customers, invoices } = await import('@/db/schema');
  const { syncXeroForOrg } = await import('@/lib/integrations/xero');
  await ensureBootstrapped();
  { const { sql } = await import('drizzle-orm'); const { DUNNING_CONTROL_DDL } = await import('@/lib/dunning-control-schema'); for (const stmt of DUNNING_CONTROL_DDL.filter((x: string) => x.includes('customer_credits'))) await db.execute(sql.raw(stmt)); }
  const [org] = await db.select().from(organizations).limit(1);
  await db.insert(integrations).values({ orgId: org.id, provider: 'xero', status: 'connected', accessToken: 'tok', refreshToken: 'ref', expiresAt: new Date(Date.now() + 3600_000), tenantId: 'T1' });
  const [cust] = await db.select().from(customers).where(eq(customers.orgId, org.id)).limit(1);

  // Invoices we already hold, with owner decisions
  const hold = async (externalId: string, number: string, status: any) => db.insert(invoices).values({ orgId: org.id, customerId: cust.id, externalId, number, status, amount: '500', amountPaid: '0', currency: 'USD', issueDate: new Date('2026-06-01'), dueDate: new Date('2026-07-01') });
  await hold('paid-elsewhere', 'INV-P', 'overdue');       // open here, paid in Xero, NOT in the open list
  await hold('voided', 'INV-V', 'overdue');               // open here, voided in Xero
  await hold('dis-then-paid', 'INV-DP', 'disputed');      // disputed here, then paid in Xero
  await hold('a5', 'INV-A5', 'disputed');                 // disputed here, still open in Xero (in the open list)
  await hold('a6', 'INV-A6', 'written_off');              // written off here, still open in Xero
  await hold('a7', 'INV-A7', 'overdue');                  // plain, still open

  const r = await syncXeroForOrg(org.id);
  console.log('RESULT', JSON.stringify({ customers: r.customersUpserted, invoices: r.invoicesUpserted, errors: r.errors, truncated: r.truncated }));
  const st = async (ext: string) => (await db.select({ s: invoices.status, paid: invoices.amountPaid }).from(invoices).where(and(eq(invoices.orgId, org.id), eq(invoices.externalId, ext))).limit(1))[0];
  for (const ext of ['paid-elsewhere', 'voided', 'dis-then-paid', 'a5', 'a6', 'a7', 'a229', 'a100', 'a199']) console.log('STATUS', ext, JSON.stringify(await st(ext)));
  const all = await db.select({ n: invoices.id }).from(invoices).where(eq(invoices.orgId, org.id));
  const cs = await db.select({ n: customers.id }).from(customers).where(eq(customers.orgId, org.id));
  console.log('COUNTS invoices', all.length, 'customers', cs.length);
  console.log('CALLS', calls.map((c) => c.replace('/api.xro/2.0', '').slice(0, 70)).join('\nCALLS '));
  // A brand-new connection with no tenant: the consent's own organisation must win over a newer one, and the first sync must work.
  { const { saveXeroConnection, syncXeroForOrg: syncAgain } = await import('@/lib/integrations/xero');
    const jwt = `h.${Buffer.from(JSON.stringify({ authentication_event_id: 'evt-mugavi' })).toString('base64url')}.s`;
    await db.delete(integrations).where(eq(integrations.orgId, org.id));
    await saveXeroConnection(org.id, { access_token: jwt, refresh_token: 'r', expires_in: 1800 });
    const [row] = await db.select().from(integrations).where(eq(integrations.orgId, org.id));
    console.log('TENANT from this consent:', row.tenantId === 'T1', '| name stored:', (row.metadata as { tenantName?: string } | null)?.tenantName === 'mugavi');
    const first = await syncAgain(org.id);
    console.log('FIRST sync errors (expect none):', JSON.stringify(first.errors.filter((e: string) => /tenant|contacts/.test(e))));
    const { disconnectXero } = await import('@/lib/integrations/xero'); await disconnectXero(org.id);
    const left = await db.select().from(integrations).where(eq(integrations.orgId, org.id));
    console.log('DISCONNECT revoked at Xero (expect only c-mine):', JSON.stringify(revoked), '| local row removed:', left.length === 0); }
  { const { customerCredits } = await import('@/db/schema'); const rows = await db.select().from(customerCredits); console.log('CREDITS (expect one row, 200.00 for c7):', rows.map((r: { amount: string }) => r.amount).join(',')); }
  server.close();
  process.exit(0);
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
