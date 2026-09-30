'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Clock, Globe2, CheckCircle2, AlertCircle, Scale } from 'lucide-react';

type Rules = { minGapDays: number; minBalance: number };
type Win = { enabled: boolean; startHour: number; endHour: number; days: number; timezone: string };
type DnsRecord = { kind: string; type: string; name: string; value: string; ttl: string; priority: number | null; status: string };
type Domain = { domain: string; localPart: string; status: string; records: DnsRecord[] } | null;

const DAYS = [['Mon', 1], ['Tue', 2], ['Wed', 4], ['Thu', 8], ['Fri', 16], ['Sat', 32], ['Sun', 64]] as const;
const ZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'Europe/London', 'Europe/Dublin', 'Europe/Berlin', 'Africa/Nairobi', 'Africa/Lagos', 'Africa/Johannesburg', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland'];
const hours = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const label = (h: number) => (h === 24 ? '24:00' : `${String(h).padStart(2, '0')}:00`);

/** Local time of the daily 14:00 UTC run, so the owner can see whether their window includes it. */
function dailyRunLocal(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date('2026-06-01T14:00:00Z'));
  } catch { return '14:00'; }
}

export function SendSettings({ window: initial, domain, emailConfigured, rules: initialRules, listOthers: initialListOthers }: { window: Win; domain: Domain; emailConfigured: boolean; rules: Rules; listOthers: boolean }) {
  const router = useRouter();
  const [w, setW] = useState<Win>(initial);
  const [rules, setRules] = useState<{ minGapDays: string; minBalance: string }>({ minGapDays: String(initialRules.minGapDays), minBalance: String(initialRules.minBalance) });
  const [listOthers, setListOthers] = useState(initialListOthers);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [domainInput, setDomainInput] = useState('');
  const [localInput, setLocalInput] = useState('billing');

  async function call(key: string, url: string, method: string, body?: unknown, okText?: string) {
    setBusy(key); setMsg(null);
    try {
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      if (okText) setMsg({ kind: 'ok', text: okText });
      router.refresh();
      return data;
    } catch (e: unknown) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(null); }
  }

  const toggleDay = (bit: number) => setW((c) => ({ ...c, days: c.days & bit ? c.days & ~bit : c.days | bit }));
  const runLocal = dailyRunLocal(w.timezone);
  const runHour = parseInt(runLocal.slice(0, 2), 10);
  const dailyRunInside = !w.enabled || (runHour >= w.startHour && runHour < w.endHour);

  return (
    <section id="send-settings" className="card-primary mb-6" aria-labelledby="send-settings-heading">
      <h2 id="send-settings-heading" className="app-heading">Sending</h2>
      {msg && <div role={msg.kind === 'err' ? 'alert' : 'status'} className={`${msg.kind === 'err' ? 'alert-danger' : 'alert-success'} mt-3`}>{msg.text}</div>}

      {/* ---- Send window ---- */}
      <div className="mt-4">
        <h3 className="app-label flex items-center gap-2"><Clock aria-hidden="true" className="h-4 w-4 text-brand-600" />Send window</h3>
        <p className="app-meta mt-0.5 font-normal">Only draft and send reminders during your business hours. Approving a draft by hand always sends straight away.</p>
        <label className="mt-3 flex items-center gap-2 text-sm text-ink-800">
          <input type="checkbox" checked={w.enabled} onChange={(e) => setW({ ...w, enabled: e.target.checked })} /> Use a send window
        </label>
        {w.enabled && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="win-start" className="label">From</label>
              <select id="win-start" className="input" value={w.startHour} onChange={(e) => setW({ ...w, startHour: Number(e.target.value) })}>
                {hours(0, 23).map((h) => <option key={h} value={h}>{label(h)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="win-end" className="label">Until</label>
              <select id="win-end" className="input" value={w.endHour} onChange={(e) => setW({ ...w, endHour: Number(e.target.value) })}>
                {hours(1, 24).map((h) => <option key={h} value={h}>{label(h)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="win-tz" className="label">Timezone</label>
              <select id="win-tz" className="input" value={w.timezone} onChange={(e) => setW({ ...w, timezone: e.target.value })}>
                {(ZONES.includes(w.timezone) ? ZONES : [w.timezone, ...ZONES]).map((z) => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}
              </select>
            </div>
            <fieldset className="sm:col-span-3 m-0 border-0 p-0">
              <legend className="label">Days</legend>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-ink-800">
                {DAYS.map(([name, bit]) => (
                  <label key={name} className="flex items-center gap-1.5"><input type="checkbox" checked={!!(w.days & bit)} onChange={() => toggleDay(bit)} />{name}</label>
                ))}
              </div>
            </fieldset>
          </div>
        )}
        {w.enabled && !dailyRunInside && (
          <div role="note" className="mt-3 flex items-start gap-2 rounded-lg border border-warn-200 bg-warn-50/40 p-3 text-sm text-ink-800">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warn-600" />
            <span>Reminders are checked once a day at 14:00 UTC, which is {runLocal} in {w.timezone.replace('_', ' ')}. That is outside this window, so nothing will send until the checks run hourly. Ask support to switch that on, or widen the window to include {runLocal}.</span>
          </div>
        )}
        <div className="mt-3">
          <button className="btn-secondary btn-sm" disabled={busy === 'window'} aria-busy={busy === 'window'} onClick={() => call('window', '/api/dunning/settings', 'PUT', { sendWindow: w }, 'Send window saved.')}>
            {busy === 'window' && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Save send window
          </button>
        </div>
      </div>

      {/* ---- Chasing rules ---- */}
      <div className="mt-8 border-t border-ink-200 pt-6">
        <h3 className="app-label flex items-center gap-2"><Scale aria-hidden="true" className="h-4 w-4 text-brand-600" />Chasing rules</h3>
        <p className="app-meta mt-0.5 font-normal">Two limits that keep reminders sensible. A customer who owes on three invoices gets one reminder, not three on the same day. Each invoice still follows its own schedule.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="rule-gap" className="label">Days between reminders to the same customer</label>
            <input id="rule-gap" className="input" type="number" min={0} max={60} step={1} inputMode="numeric" value={rules.minGapDays} onChange={(e) => setRules({ ...rules, minGapDays: e.target.value })} />
            <p className="app-meta mt-1 font-normal">0 turns this off.</p>
          </div>
          <div>
            <label htmlFor="rule-min" className="label">Skip invoices with a balance below</label>
            <input id="rule-min" className="input" type="number" min={0} step="0.01" inputMode="decimal" value={rules.minBalance} onChange={(e) => setRules({ ...rules, minBalance: e.target.value })} />
            <p className="app-meta mt-1 font-normal">0 turns this off. Uses the invoice&apos;s own currency.</p>
          </div>
        </div>
        <div className="mt-3">
          <button className="btn-secondary btn-sm" disabled={busy === 'rules'} aria-busy={busy === 'rules'} onClick={() => call('rules', '/api/dunning/settings', 'PUT', { chasing: { minGapDays: Number(rules.minGapDays), minBalance: Number(rules.minBalance) } }, 'Chasing rules saved.')}>
            {busy === 'rules' && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Save chasing rules
          </button>
        </div>
      </div>

      {/* ---- One reminder, every overdue invoice ---- */}
      <div className="mt-8 border-t border-ink-200 pt-6">
        <h3 className="app-label">List the customer&apos;s other overdue invoices</h3>
        <p className="app-meta mt-0.5 font-normal">Since a customer gets one reminder, not one per invoice, that reminder can show everything they owe: a short table and a total, added under the message. We write the table from your invoices, not the AI. Invoices in another currency, with a promise to pay, disputed, or waiting on a reply are left out. You see what will be added before you approve a reminder.</p>
        <label className="mt-3 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={listOthers} disabled={busy === 'others'} onChange={async (e) => {
            const next = e.target.checked;
            setListOthers(next);
            const ok = await call('others', '/api/dunning/settings', 'PUT', { listOtherInvoices: next }, next ? 'Reminders will list other overdue invoices.' : 'Reminders will only mention the one invoice.');
            if (!ok) setListOthers(!next);
          }} />
          List other overdue invoices in each reminder
        </label>
      </div>

      {/* ---- Own domain ---- */}
      <div className="mt-8 border-t border-ink-200 pt-6">
        <h3 className="app-label flex items-center gap-2"><Globe2 aria-hidden="true" className="h-4 w-4 text-brand-600" />Send from your own domain</h3>
        {!domain ? (
          <>
            <p className="app-meta mt-0.5 font-normal">Reminders currently arrive as &quot;Your Business via Mugavi&quot;. Connect your domain and they arrive from your own address instead, for example billing@yourcompany.com. You will add a few DNS records at your domain registrar.</p>
            {!emailConfigured && <div role="note" className="alert-danger mt-3">Email sending is not configured on this server, so a domain can&apos;t be connected yet.</div>}
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label htmlFor="dom" className="label">Your domain</label>
                <input id="dom" className="input" placeholder="yourcompany.com" value={domainInput} onChange={(e) => setDomainInput(e.target.value)} />
              </div>
              <div>
                <label htmlFor="dom-local" className="label">Send as</label>
                <div className="flex items-center gap-1">
                  <input id="dom-local" className="input w-28" value={localInput} onChange={(e) => setLocalInput(e.target.value)} maxLength={64} />
                  <span className="text-sm text-ink-600">@{domainInput.trim() || 'yourcompany.com'}</span>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <button className="btn-primary btn-sm" disabled={!emailConfigured || !domainInput.trim() || busy === 'add'} aria-busy={busy === 'add'} onClick={() => call('add', '/api/dunning/domain', 'POST', { domain: domainInput, localPart: localInput }, 'Domain added. Add the DNS records below, then check verification.')}>
                {busy === 'add' && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Connect domain
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-800">
              <span className="font-medium">{domain.localPart}@{domain.domain}</span>
              {domain.status === 'verified'
                ? <span className="inline-flex items-center gap-1 text-success-700"><CheckCircle2 aria-hidden="true" className="h-4 w-4" />Verified. Reminders are sent from this address.</span>
                : domain.status === 'failed'
                  ? <span className="inline-flex items-center gap-1 text-danger-700"><AlertCircle aria-hidden="true" className="h-4 w-4" />Verification failed. Check the records below.</span>
                  : <span className="text-ink-600">Waiting for DNS. Reminders still go out as &quot;via Mugavi&quot; until this is verified.</span>}
            </p>
            {domain.status !== 'verified' && domain.records.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-lg border border-ink-200">
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">DNS records to add at your registrar</caption>
                  <thead className="bg-ink-50 text-ink-600"><tr><th scope="col" className="px-3 py-2">Type</th><th scope="col" className="px-3 py-2">Name</th><th scope="col" className="px-3 py-2">Value</th><th scope="col" className="px-3 py-2">Status</th></tr></thead>
                  <tbody>
                    {domain.records.map((r, i) => (
                      <tr key={i} className="border-t border-ink-100 align-top">
                        <td className="px-3 py-2 font-mono">{r.type}{r.priority !== null ? ` (${r.priority})` : ''}</td>
                        <td className="px-3 py-2 font-mono break-all">{r.name}</td>
                        <td className="px-3 py-2 font-mono break-all">{r.value}</td>
                        <td className="px-3 py-2">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {domain.status !== 'verified' && (
                <button className="btn-primary btn-sm" disabled={busy === 'verify'} aria-busy={busy === 'verify'} onClick={() => call('verify', '/api/dunning/domain/verify', 'POST', undefined, 'Checked. If it still says waiting, DNS can take a while; try again later.')}>
                  {busy === 'verify' && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}Check verification
                </button>
              )}
              <button className="btn-ghost btn-sm" disabled={busy === 'remove'} onClick={() => call('remove', '/api/dunning/domain', 'DELETE', undefined, 'Domain removed. Reminders go out as "via Mugavi" again.')}>Remove domain</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
