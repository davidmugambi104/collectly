'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FIELDS, FIELD_LABEL, type Field } from '@/lib/integrations/csv-fields';

type Preview = {
  ok: boolean; headers: string[]; mapping: Partial<Record<Field, number | null>>; source: string | null; dateFormat: 'mdy' | 'dmy'; dateFormatAssumed: boolean;
  totalRows: number; goodRows: number; errorCount: number; errors: Array<{ row: number; message: string }>; warningCount: number; warnings: Array<{ row: number; message: string }>;
  notes: string[]; fatal: string | null; alreadyClosed: number; sample?: Array<Record<string, string | number | null>>; error?: string;
  imported?: boolean; result?: { created: number; updated: number; unchanged: number; skippedClosed: number; closed: number; customers: number; errors: string[] };
};

const MAX_BYTES = 5 * 1024 * 1024;

export function CsvImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<Partial<Record<Field, number | null>> | null>(null);
  const [dateFormat, setDateFormat] = useState<'auto' | 'mdy' | 'dmy'>('auto');
  const [currency, setCurrency] = useState('USD');
  const [data, setData] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function call(csv: string, m: typeof mapping, df: typeof dateFormat, cur: string, confirm: boolean) {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/integrations/csv-import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, mapping: m ?? undefined, dateFormat: df, defaultCurrency: cur, confirm }),
      });
      const j = (await res.json().catch(() => ({}))) as Preview;
      if (!res.ok && !j.headers) { setError(j.error ?? `Something went wrong (${res.status}).`); setData(null); return; }
      setData(j);
      if (!confirm && j.mapping && !m) setMapping(j.mapping);
      if (confirm && j.imported) router.refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setData(null); setMapping(null); setError('');
    if (f.size > MAX_BYTES) { setError('That file is larger than 5 MB. Split it into smaller files.'); return; }
    const t = await f.text();
    setText(t); setFileName(f.name);
    await call(t, null, dateFormat, currency, false);
  }

  const rerun = (m: typeof mapping, df = dateFormat, cur = currency) => { if (text) void call(text, m, df, cur, false); };
  const done = !!data?.imported;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="app-title">1. Choose your export</h2>
        <p className="app-body mt-1.5">Export your open invoices as a CSV from QuickBooks, Xero, FreshBooks, Zoho Books, Sage, Wave or Excel. We need the invoice number, customer name, amount and dates; balance, currency, status and customer email are optional. Up to 5 MB and 5,000 rows.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="sr-only" id="csv-file" onChange={(e) => void onFile(e.target.files?.[0])} />
          <label htmlFor="csv-file" className="btn-primary btn-sm cursor-pointer"><Upload className="h-3.5 w-3.5" />{text ? 'Choose a different file' : 'Choose a CSV file'}</label>
          {fileName && <span className="text-sm text-ink-600">{fileName}</span>}
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-label="Working" />}
        </div>
        <p className="app-meta mt-3 font-normal">Re-upload to refresh; it does not sync automatically.</p>
      </div>

      {error && <div role="alert" className="card row-urgent"><p className="text-sm text-danger-900 flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{error}</p></div>}

      {data && !done && (
        <>
          <div className="card">
            <h2 className="app-title">2. Check the columns</h2>
            {data.source && <p className="app-body mt-1.5">This looks like a {data.source} export. Check the match below.</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <label key={f} className="block text-sm">
                  <span className="text-ink-700">{FIELD_LABEL[f]}</span>
                  <select
                    className="mt-1 block w-full rounded-md border border-ink-200 bg-white px-2 py-1.5 text-sm"
                    value={(data.mapping[f] ?? -1) as number}
                    disabled={busy}
                    onChange={(e) => { const v = Number(e.target.value); const m = { ...data.mapping, [f]: v < 0 ? null : v }; setMapping(m); rerun(m); }}
                  >
                    <option value={-1}>None</option>
                    {data.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
              <label className="block text-sm">
                <span className="text-ink-700">Dates are written as</span>
                <select className="mt-1 block w-full rounded-md border border-ink-200 bg-white px-2 py-1.5 text-sm" value={dateFormat} disabled={busy}
                  onChange={(e) => { const v = e.target.value as typeof dateFormat; setDateFormat(v); rerun(mapping, v); }}>
                  <option value="auto">Work it out from the file</option>
                  <option value="mdy">Month/day/year (03/04/2026 is 4 March)</option>
                  <option value="dmy">Day/month/year (03/04/2026 is 3 April)</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-ink-700">Currency when the file has none</span>
                <input className="mt-1 block w-full rounded-md border border-ink-200 bg-white px-2 py-1.5 text-sm uppercase" value={currency} maxLength={3} disabled={busy}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())} onBlur={() => rerun(mapping, dateFormat, currency)} />
              </label>
            </div>
            {data.notes.length > 0 && <ul className="mt-4 space-y-1 text-sm text-ink-600 list-disc pl-5">{data.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
          </div>

          <div className="card">
            <h2 className="app-title">3. Preview</h2>
            {data.fatal ? (
              <p role="alert" className="mt-2 text-sm text-danger-900">{data.fatal}</p>
            ) : (
              <>
                <p className="app-body mt-1.5">
                  {data.goodRows} of {data.totalRows} rows are ready{data.errorCount > 0 ? `; ${data.errorCount} have a problem and will be skipped` : ''}.
                  {data.alreadyClosed > 0 ? ` ${data.alreadyClosed} are already paid, void or draft, so they are not added as new invoices.` : ''}
                </p>
                {data.sample && data.sample.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead><tr className="text-ink-500"><th className="py-1 pr-3">Invoice</th><th className="pr-3">Customer</th><th className="pr-3">Amount</th><th className="pr-3">Still due</th><th className="pr-3">Issued</th><th className="pr-3">Due</th></tr></thead>
                      <tbody>
                        {data.sample.map((r) => (
                          <tr key={String(r.row)} className="border-t border-ink-100">
                            <td className="py-1 pr-3">{r.invoiceNumber}</td><td className="pr-3">{r.customerName}</td><td className="pr-3">{r.amount} {r.currency}</td>
                            <td className="pr-3">{r.balance}</td><td className="pr-3">{r.issueDate}</td><td className="pr-3">{r.dueDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.goodRows > data.sample.length && <p className="app-meta mt-1 font-normal">First {data.sample.length} shown.</p>}
                  </div>
                )}
                {data.errorCount > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-ink-800">Rows that will be skipped</h3>
                    <ul className="mt-1 space-y-1 text-sm text-danger-900">
                      {data.errors.map((e) => <li key={`${e.row}-${e.message}`}>Row {e.row}: {e.message}</li>)}
                    </ul>
                    {data.errorCount > data.errors.length && <p className="app-meta mt-1 font-normal">And {data.errorCount - data.errors.length} more.</p>}
                  </div>
                )}
                {data.warningCount > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-ink-600">{data.warnings.map((e) => <li key={`${e.row}-${e.message}`}>Row {e.row}: {e.message}</li>)}</ul>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="button" className="btn-primary" disabled={busy || data.goodRows === 0 || !text} onClick={() => text && void call(text, mapping, dateFormat, currency, true)}>
                    {busy ? 'Importing…' : `Import ${data.goodRows} row${data.goodRows === 1 ? '' : 's'}`}
                  </button>
                  <span className="app-meta font-normal">Importing the same file again updates those invoices; it does not add duplicates.</span>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {done && data?.result && (
        <div className="card bg-success-50 border-success-200" role="status">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success-700 shrink-0 mt-0.5" />
            <div className="text-sm text-success-900">
              <p><b>Imported.</b> {data.result.created} new invoice{data.result.created === 1 ? '' : 's'}, {data.result.updated} updated, {data.result.unchanged} unchanged{data.result.skippedClosed ? `, ${data.result.skippedClosed} skipped because they are already paid, void or draft` : ''}.</p>
              {data.errorCount > 0 && <p className="mt-1">{data.errorCount} row{data.errorCount === 1 ? ' was' : 's were'} skipped for the problems listed in the preview.</p>}
              {data.result.errors.length > 0 && <p className="mt-1">Problems while saving: {data.result.errors.slice(0, 3).join('; ')}</p>}
              <p className="mt-2">Re-upload to refresh; it does not sync automatically. To take this data out again, use Remove on the Integrations page.</p>
              <p className="mt-2"><Link className="btn-primary btn-sm" href="/dashboard/dunning">Next: draft your first reminders</Link></p>
              <p className="mt-2"><Link className="link" href="/dashboard/invoices">See the invoices</Link> · <Link className="link" href="/dashboard/integrations">Back to integrations</Link></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
