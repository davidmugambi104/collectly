import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-helper';
import { ensureBootstrapped } from '@/lib/bootstrap-db';
import { noStore } from '@/lib/no-store';
import { rateLimit } from '@/lib/rate-limit';
import { recordFunnelEvent } from '@/lib/funnel-events';
import { analyzeCsv, csvAdapter, CSV_MAX_BYTES, CSV_MAX_ROWS, FIELDS, type DateFormat, type Mapping } from '@/lib/integrations/csv-import';
import { runSync } from '@/lib/integrations/adapter';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/integrations/csv-import
 * Body: { csv: string, mapping?: { [field]: columnIndex | null }, dateFormat?: 'auto'|'mdy'|'dmy', defaultCurrency?: 'USD', confirm?: boolean }
 *
 * Without `confirm` it only reads the file and answers what it found (columns, row-level errors, a sample): nothing is written.
 * With `confirm: true` it checks the file again from scratch (the browser's preview is never trusted) and imports the good rows
 * for the signed-in organization only. Importing again updates the same invoices (same invoice number and customer) instead of duplicating.
 * Limits: 5 MB, 5000 rows. Rate limited per organization.
 */
async function handler(req: NextRequest) {
  await ensureBootstrapped();
  const { orgId, userId } = await getAuth();
  if (!orgId || !userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // The CSV travels inside JSON, so allow a little headroom for escaping, then check the real size below.
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > CSV_MAX_BYTES * 2 + 4096) return NextResponse.json({ error: 'The file is larger than 5 MB.' }, { status: 413 });
  const raw = await req.text();
  if (raw.length > CSV_MAX_BYTES * 2 + 4096) return NextResponse.json({ error: 'The file is larger than 5 MB.' }, { status: 413 });

  let body: { csv?: unknown; mapping?: unknown; dateFormat?: unknown; defaultCurrency?: unknown; confirm?: unknown } = {};
  try { const p = JSON.parse(raw); if (p && typeof p === 'object') body = p; } catch { return NextResponse.json({ error: 'Send JSON with a csv field.' }, { status: 400 }); }
  if (typeof body.csv !== 'string') return NextResponse.json({ error: 'Send the file text as "csv".' }, { status: 400 });
  if (Buffer.byteLength(body.csv, 'utf8') > CSV_MAX_BYTES) return NextResponse.json({ error: 'The file is larger than 5 MB.' }, { status: 413 });

  const confirm = body.confirm === true;
  const rl = confirm
    ? await rateLimit(orgId, { key: 'csv-import-confirm', max: 6, windowMs: 10 * 60_000 })
    : await rateLimit(orgId, { key: 'csv-import-preview', max: 20, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many imports in a short time. Wait a few minutes and try again.' }, { status: 429 });

  // Only known fields, only whole-number column indexes (or null).
  const mapping: Mapping = {};
  if (body.mapping && typeof body.mapping === 'object') {
    for (const f of FIELDS) {
      const v = (body.mapping as Record<string, unknown>)[f];
      if (v === null) mapping[f] = null;
      else if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 500) mapping[f] = v;
    }
  }
  const dateFormat: DateFormat = body.dateFormat === 'mdy' || body.dateFormat === 'dmy' ? body.dateFormat : 'auto';
  const defaultCurrency = typeof body.defaultCurrency === 'string' ? body.defaultCurrency : 'USD';

  const a = analyzeCsv(body.csv, { mapping, dateFormat, defaultCurrency });
  const view = {
    headers: a.headers, mapping: a.mapping, source: a.source, dateFormat: a.dateFormat, dateFormatAssumed: a.dateFormatAssumed,
    totalRows: a.totalRows, goodRows: a.good.length, errorCount: a.errors.length, errors: a.errors.slice(0, 50),
    warningCount: a.warnings.length, warnings: a.warnings.slice(0, 20), notes: a.notes, fatal: a.fatal,
    alreadyClosed: a.good.filter((r) => r.state !== 'open').length,
    limits: { maxBytes: CSV_MAX_BYTES, maxRows: CSV_MAX_ROWS },
  };
  if (a.fatal) return NextResponse.json({ ok: false, ...view }, { status: 422 });

  if (!confirm) {
    const sample = a.good.slice(0, 8).map((r) => ({
      row: r.rowNumber, invoiceNumber: r.invoiceNumber, customerName: r.customerName, customerEmail: r.customerEmail, amount: r.amount, balance: r.balance,
      currency: r.currency, issueDate: r.issueDate.toISOString().slice(0, 10), dueDate: r.dueDate.toISOString().slice(0, 10), state: r.state,
    }));
    return NextResponse.json({ ok: true, preview: true, ...view, sample });
  }

  if (a.good.length === 0) return NextResponse.json({ ok: false, ...view, error: 'No row passed the checks, so nothing was imported.' }, { status: 422 });
  try {
    const result = await runSync(csvAdapter(a.good), orgId);
    await recordFunnelEvent(orgId, 'integration.synced', userId, {
      provider: 'csv', customers: result.customersUpserted, invoices: result.invoicesUpserted, rowErrors: a.errors.length + result.errors.length, hadInvoices: result.invoicesUpserted > 0,
    });
    return NextResponse.json({ ok: true, imported: true, ...view, result: {
      created: result.invoicesCreated, updated: result.invoicesUpdated, unchanged: result.invoicesUpserted - result.invoicesCreated - result.invoicesUpdated,
      skippedClosed: result.invoicesSkippedClosed, closed: result.invoicesClosed, customers: result.customersUpserted, errors: result.errors.slice(0, 20),
    } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return noStore(await handler(req));
}
