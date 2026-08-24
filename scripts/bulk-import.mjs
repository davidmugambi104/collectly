/**
 * Import prospects from a CSV into the Google Sheet.
 *
 * Expected CSV columns (any subset, order does not matter):
 *   company, domain, website, city, state, country, service, employees,
 *   decision_maker, role, linkedin_url, email_guess, signal, signal_source,
 *   notes, icp_fit
 *
 * Usage:
 *   node scripts/bulk-import.mjs path/to/file.csv --source=apollo-export
 *   node scripts/bulk-import.mjs path/to/file.csv --source=manual --verify
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'node:url';
import { readSheet, appendRows, ensureSheet } from './sheets.mjs';

path.dirname(fileURLToPath(import.meta.url));

const SHEET_NAME = 'Prospects';
const HEADERS = [
  'id', 'source', 'company', 'domain', 'website', 'city', 'state', 'country',
  'service', 'employees', 'employees_source', 'decision_maker', 'role',
  'linkedin_url', 'email_guess', 'email_verified', 'email_status', 'confidence',
  'signal', 'signal_source', 'icp_fit', 'status', 'last_touch', 'next_touch',
  'notes', 'created_at',
];

const FIELD_ALIASES = {
  company: ['company', 'organization', 'company_name', 'org'],
  domain: ['domain', 'domain_name', 'company_domain'],
  website: ['website', 'url', 'company_url'],
  city: ['city'],
  state: ['state', 'state_code', 'region'],
  country: ['country', 'country_code'],
  service: ['service', 'services', 'industry', 'vertical'],
  employees: ['employees', 'employee_count', 'size', 'headcount'],
  decision_maker: ['decision_maker', 'name', 'full_name', 'contact_name'],
  role: ['role', 'title', 'job_title', 'position'],
  linkedin_url: ['linkedin_url', 'linkedin', 'linkedin_profile_url'],
  email_guess: ['email_guess', 'email', 'work_email', 'professional_email'],
  signal: ['signal', 'buying_signal', 'intent'],
  signal_source: ['signal_source', 'source_detail'],
  icp_fit: ['icp_fit', 'fit'],
  notes: ['notes', 'note', 'extra'],
};

function parseArgs() {
  const file = process.argv[2];
  const sourceMatch = process.argv.find(a => a.startsWith('--source='));
  const source = sourceMatch ? sourceMatch.split('=')[1] : 'csv-import';
  const verify = process.argv.includes('--verify');
  const dryRun = process.argv.includes('--dry-run');

  if (!file || file.startsWith('--') || !fs.existsSync(file)) {
    console.error('Usage: node scripts/bulk-import.mjs <path/to/file.csv> [--source=apollo-export] [--verify] [--dry-run]');
    process.exit(1);
  }
  return { file, source, verify, dryRun };
}

function today() {
  // Prefix with apostrophe so Google Sheets treats it as text, not a date serial
  return `'${new Date().toISOString().split('T')[0]}`;
}

function uuid() {
  return `pro_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeDomain(input) {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .trim();
}

function normalizeWebsite(input) {
  if (!input) return '';
  let url = input.trim();
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  return url;
}

function mapRecord(record, source) {
  const out = {};
  for (const [target, aliases] of Object.entries(FIELD_ALIASES)) {
    const key = Object.keys(record).find(k => aliases.includes(k.toLowerCase().trim().replace(/\s+/g, '_')));
    out[target] = key ? record[key] : '';
  }

  // Clean domain/website
  out.domain = normalizeDomain(out.domain || out.website || out.company);
  out.website = normalizeWebsite(out.website || out.domain);
  if (!out.company) out.company = out.domain.split('.')[0];

  // Basic email sanity
  const email = (out.email_guess || '').trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  out.email_guess = emailValid ? email : '';

  out.source = source;
  out.id = uuid();
  out.email_verified = 'no';
  out.email_status = 'imported';
  out.status = 'research';
  out.created_at = today();
  out.employees_source = 'csv';

  // Infer ICP fit if not provided
  if (!out.icp_fit) {
    const n = parseInt(out.employees, 10);
    if (!isNaN(n) && n >= 5 && n <= 50) out.icp_fit = 'medium';
    else if (!isNaN(n)) out.icp_fit = n < 5 ? 'weak-size' : 'weak-size';
    else out.icp_fit = 'unknown';
  }

  return out;
}

async function verifyEmail(email) {
  const key = process.env.ZEROBOUNCE_API_KEY;
  const url = `https://api.zerobounce.net/v2/validate?api_key=${key}&email=${encodeURIComponent(email)}&ip_address=`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ZeroBounce ${res.status}`);
  return res.json();
}

function sendDecision(result) {
  if (result.status === 'valid') return 'send';
  if (['catch-all', 'unknown'].includes(result.status)) return 'review';
  if (['invalid', 'spamtrap', 'abuse', 'do_not_mail', 'disposable'].includes(result.status)) return 'skip';
  return 'review';
}

async function main() {
  const { file, source, verify, dryRun } = parseArgs();

  const buffer = fs.readFileSync(file);
  const records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });

  console.log(`Parsed ${records.length} rows from ${file}`);

  await ensureSheet(SHEET_NAME);
  const existing = await readSheet(`${SHEET_NAME}!A1:Z`);
  const headers = existing[0] || HEADERS;
  const data = existing.slice(1);
  const domainCol = headers.indexOf('domain');
  const emailCol = headers.indexOf('email_guess');
  headers.indexOf('id');

  // Index existing rows by domain (and by domain+email if email exists)
  const existingByDomain = new Map();
  const existingByDomainEmail = new Set();
  data.forEach((row, idx) => {
    const d = domainCol >= 0 ? normalizeDomain(row[domainCol]) : '';
    const e = emailCol >= 0 ? (row[emailCol] || '').toLowerCase() : '';
    if (d) existingByDomain.set(d, { row, sheetRow: idx + 2 });
    if (d || e) existingByDomainEmail.add(`${d}|${e}`);
  });

  const toUpdate = []; // { sheetRow, row } pairs
  const toAppend = [];

  for (const raw of records) {
    const mapped = mapRecord(raw, source);
    const key = `${mapped.domain}|${mapped.email_guess.toLowerCase()}`;

    if (existingByDomainEmail.has(key)) {
      console.log(`  Skipping exact duplicate: ${mapped.company} / ${mapped.email_guess || '(no email)'}`);
      continue;
    }

    // If same domain exists with no email, update that row instead of appending
    const existingDomain = existingByDomain.get(mapped.domain);
    if (existingDomain && !existingDomain.row[emailCol] && mapped.email_guess) {
      const merged = [...existingDomain.row];
      for (let i = 0; i < HEADERS.length; i++) {
        const h = HEADERS[i];
        if (mapped[h] !== undefined && mapped[h] !== '' && (!merged[i] || merged[i] === '')) {
          merged[i] = mapped[h];
        }
      }
      toUpdate.push({ sheetRow: existingDomain.sheetRow, row: merged, sourceRow: mapped });
      continue;
    }

    toAppend.push(mapped);
  }

  console.log(`After dedupe: ${toAppend.length} new rows, ${toUpdate.length} rows to merge`);

  if (dryRun) {
    for (const { sourceRow } of toUpdate.slice(0, 5)) {
      console.log('  Would update row', sourceRow.company, sourceRow.domain, sourceRow.email_guess);
    }
    for (const r of toAppend.slice(0, 5)) {
      console.log('  Would add:', r.company, r.domain, r.email_guess);
    }
    if (toUpdate.length + toAppend.length > 5) {
      console.log(`  ... and ${toUpdate.length + toAppend.length - 5} more`);
    }
    return;
  }

  // Verify new rows
  if (verify) {
    for (const r of toAppend) {
      if (!r.email_guess) continue;
      try {
        const result = await verifyEmail(r.email_guess);
        const decision = sendDecision(result);
        r.email_verified = result.status === 'valid' ? 'yes' : 'no';
        r.email_status = `${result.status} → ${decision}`;
        if (result.firstname && !r.decision_maker) {
          r.decision_maker = `${result.firstname} ${result.lastname || ''}`.trim();
        }
        if (result.catchall_domain) {
          r.notes = [r.notes, 'catch-all domain'].filter(Boolean).join('; ');
        }
        await new Promise(res => setTimeout(res, 500));
      } catch (err) {
        console.warn(`  Verify failed for ${r.email_guess}: ${err.message}`);
        r.email_status = `verify-error: ${err.message}`;
      }
    }
  }

  // Update merged rows
  const rowsToUpdate = toUpdate.filter(({ row }) => row.length > 0);
  if (rowsToUpdate.length > 0) {
    for (const { sheetRow, row } of rowsToUpdate) {
      const range = `${SHEET_NAME}!A${sheetRow}:Z${sheetRow}`;
      await updateRange(range, [row]);
    }
    console.log(`✓ Updated ${rowsToUpdate.length} merged rows in ${SHEET_NAME}`);
  }

  // Append new rows
  const rows = toAppend.map(r => HEADERS.map(h => r[h] ?? ''));
  if (rows.length > 0) {
    await appendRows(`${SHEET_NAME}!A1`, rows);
    console.log(`✓ Appended ${rows.length} rows to ${SHEET_NAME}`);
  }

  if (rowsToUpdate.length === 0 && rows.length === 0) {
    console.log('No changes to make.');
  }
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
