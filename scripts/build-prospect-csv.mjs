/**
 * Build a prospect CSV from a list of agency domains.
 *
 * Uses:
 *   - BuiltWith to detect QuickBooks/Xero (free tier)
 *   - Hunter to find email patterns (uses limited free credits)
 *
 * Usage:
 *   node scripts/build-prospect-csv.mjs domains.txt --out=/tmp/prospects.csv
 *   node scripts/build-prospect-csv.mjs domains.txt --out=/tmp/prospects.csv --no-hunter
 *
 * Input file format (domains.txt):
 *   lgxbranding.com
 *   dsquaredmedia.net
 *   fairmarketing.com
 *   bowenmedia.com
 *   csp.agency
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

function loadEnv() {
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_]+)="(.*)"$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2];
    }
  }
}
loadEnv();

const HEADERS = [
  'company', 'domain', 'website', 'city', 'state', 'country', 'service',
  'employees', 'decision_maker', 'role', 'linkedin_url', 'email_guess',
  'signal', 'signal_source', 'icp_fit', 'notes',
];

function parseArgs() {
  const input = process.argv[2];
  const outMatch = process.argv.find(a => a.startsWith('--out='));
  const output = outMatch ? outMatch.split('=')[1] : 'outreach/data/new-prospects.csv';
  const useHunter = !process.argv.includes('--no-hunter');

  if (!input || !fs.existsSync(input)) {
    console.error('Usage: node scripts/build-prospect-csv.mjs <domains.txt> [--out=path.csv] [--no-hunter]');
    process.exit(1);
  }
  return { input, output, useHunter };
}

function normalizeDomain(input) {
  return input
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .trim();
}

function inferCompanyName(domain) {
  const parts = domain.split('.');
  let name = parts[0];
  name = name.replace(/[-_]/g, ' ');
  return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function builtwithCheck(domain) {
  const key = process.env.BUILTWITH_API_KEY;
  if (!key) return null;
  const url = `https://api.builtwith.com/v18/api.json?KEY=***})}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function detectAccountingTech(bw) {
  if (!bw?.Results?.length) return { has_qbo: false, has_xero: false };
  const techs = [];
  for (const result of bw.Results) {
    for (const path of result.Result?.Paths || []) {
      for (const t of path.Technologies || []) {
        techs.push(t.Name?.toLowerCase() || '');
      }
    }
  }
  return {
    has_qbo: techs.some(t => t.includes('quickbooks')),
    has_xero: techs.some(t => t.includes('xero')),
  };
}

async function hunterPattern(domain) {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return null;
  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=***}&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      console.warn(`Hunter error for ${domain}: ${body.slice(0, 120)}`);
      return null;
    }
    return res.json();
  } catch (err) {
    console.warn(`Hunter failed for ${domain}: ${err.message}`);
    return null;
  }
}

function inferEmailFromPattern(pattern, firstName, lastName) {
  if (!pattern || !firstName) return '';
  const f = firstName.toLowerCase().replace(/\s+/g, '');
  const l = (lastName || '').toLowerCase().replace(/\s+/g, '');
  const fi = f.charAt(0);
  const li = l ? l.charAt(0) : '';

  return pattern
    .replace(/\{firstname\}/g, f)
    .replace(/\{lastName\}/g, l)
    .replace(/\{last_name\}/g, l)
    .replace(/\{f\}/g, fi)
    .replace(/\{l\}/g, li)
    .replace(/\{fi\}/g, fi)
    .replace(/\{li\}/g, li);
}

async function main() {
  const { input, output, useHunter } = parseArgs();
  const domains = fs.readFileSync(input, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  console.log(`Processing ${domains.length} domains...`);
  if (useHunter) console.log('Hunter enrichment enabled (uses free credits).');
  else console.log('Hunter enrichment disabled. Email guesses will be blank.');

  const rows = [];
  for (const raw of domains) {
    const domain = normalizeDomain(raw);
    console.log(`  ${domain}`);

    const company = inferCompanyName(domain);
    const website = `https://${domain}`;

    const bw = await builtwithCheck(domain);
    const tech = detectAccountingTech(bw);

    let hunter = null;
    if (useHunter) {
      hunter = await hunterPattern(domain);
      await new Promise(r => setTimeout(r, 300));
    }

    const pattern = hunter?.data?.pattern || '';
    const email = pattern ? inferEmailFromPattern(pattern, 'firstname', 'lastname') : '';

    const notes = [
      tech.has_qbo ? 'detected QuickBooks' : '',
      tech.has_xero ? 'detected Xero' : '',
      pattern ? `hunter pattern: ${pattern}` : '',
    ].filter(Boolean).join('; ');

    const signal = tech.has_qbo || tech.has_xero ? 'accounting_stack_match' : '';
    const signalSource = tech.has_qbo || tech.has_xero ? 'builtwith' : '';
    const icpFit = tech.has_qbo || tech.has_xero ? 'strong' : 'unknown';

    rows.push({
      company,
      domain,
      website,
      city: '',
      state: '',
      country: '',
      service: '',
      employees: '',
      decision_maker: '',
      role: '',
      linkedin_url: '',
      email_guess: email,
      signal,
      signal_source: signalSource,
      icp_fit: icpFit,
      notes,
    });
  }

  const csv = [
    HEADERS.join(','),
    ...rows.map(r => HEADERS.map(h => {
      const val = r[h] ?? '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',')),
  ].join('\n');

  const outPath = path.resolve(__dirname, '..', output);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, csv);

  console.log(`\nWrote ${rows.length} rows to ${outPath}`);
  console.log('Next steps:');
  console.log('  1. Open the CSV and fill in decision_maker, role, city, state, employees, email_guess');
  console.log('  2. Run: node scripts/bulk-import.mjs ' + output + ' --source=research');
  console.log('  3. When ZeroBounce credits reset, run: node scripts/verify-emails.mjs');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
