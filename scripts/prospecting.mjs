/**
 * Enrich a single company domain and append it to the Google Sheet.
 *
 * Usage:
 *   node scripts/prospecting.mjs lgxbranding.com
 *   node scripts/prospecting.mjs dsquaredmedia.net --source=audit
 */
import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendRows, readSheet, ensureSheet } from './sheets.mjs';

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

const SHEET_NAME = 'Prospects';
const HEADERS = [
  'id', 'source', 'company', 'domain', 'website', 'city', 'state', 'country',
  'service', 'employees', 'employees_source', 'decision_maker', 'role',
  'linkedin_url', 'email_guess', 'email_verified', 'email_status', 'confidence',
  'signal', 'signal_source', 'icp_fit', 'status', 'last_touch', 'next_touch',
  'notes', 'created_at',
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function today() {
  return `'${new Date().toISOString().split('T')[0]}`;
}

function uuid() {
  return `pro_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function parseArgs() {
  const domain = process.argv[2];
  const sourceMatch = process.argv.find(a => a.startsWith('--source='));
  const source = sourceMatch ? sourceMatch.split('=')[1] : 'manual';
  if (!domain || domain.startsWith('--')) {
    console.error('Usage: node scripts/prospecting.mjs <domain> [--source=audit|manual|apollo|etc]');
    process.exit(1);
  }
  return { domain, source };
}

async function hunterFind(domain) {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return null;
  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${key}&limit=10`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    console.warn(`Hunter API error ${res.status}: ${body.slice(0, 200)}`);
    return null;
  }
  return res.json();
}

async function apolloFind(domain) {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return null;
  const res = await fetch('https://api.apollo.io/v1/people/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': key,
    },
    body: JSON.stringify({
      domain,
      person_titles: ['CEO', 'Founder', 'Co-Founder', 'Owner', 'President', 'Managing Director', 'Finance Director', 'Head of Finance'],
      page: 1,
      per_page: 5,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`Apollo API error ${res.status}: ${body.slice(0, 200)}`);
    return null;
  }
  return res.json();
}

async function builtwithCheck(domain) {
  const key = process.env.BUILTWITH_API_KEY;
  if (!key) return null;
  const url = `https://api.builtwith.com/v18/api.json?KEY=${key}&LOOKUP=${encodeURIComponent(domain)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    console.warn(`BuiltWith API error ${res.status}: ${body.slice(0, 200)}`);
    return null;
  }
  return res.json();
}

function extractHunterBest(hunter) {
  if (!hunter?.data?.emails?.length) return {};
  const emails = hunter.data.emails;
  const exec = emails.find(e =>
    /ceo|founder|owner|president|managing director/i.test(e.position || '')
  ) || emails[0];
  return {
    email_guess: exec.value || null,
    email_status: exec.verification?.status || 'unknown',
    confidence: hunter.data.pattern
      ? `pattern:${hunter.data.pattern}`
      : exec.confidence ?? null,
  };
}

function extractApolloBest(apollo) {
  if (!apollo?.people?.length) return {};
  const people = apollo.people;
  const p = people[0];
  return {
    decision_maker: p.name || null,
    role: p.title || null,
    linkedin_url: p.linkedin_url || null,
    email_guess: p.email || null,
    confidence: p.email_status || p.employment_status || null,
  };
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
  const hasQbo = techs.some(t => t.includes('quickbooks'));
  const hasXero = techs.some(t => t.includes('xero'));
  return { has_qbo: hasQbo, has_xero: hasXero };
}

function inferCompanyName(domain, hunter, apollo) {
  if (apollo?.people?.[0]?.organization?.name) return apollo.people[0].organization.name;
  if (hunter?.data?.organization) return hunter.data.organization;
  return domain.replace(/^www\./, '').split('.')[0];
}

function inferEmployees(hunter, apollo) {
  if (apollo?.people?.[0]?.organization?.employee_count) return String(apollo.people[0].organization.employee_count);
  if (hunter?.data?.emails?.length) {
    // Very rough lower-bound estimate
    return `~${Math.max(1, hunter.data.emails.length)}`;
  }
  return null;
}

function inferLocation(hunter, apollo) {
  const org = apollo?.people?.[0]?.organization;
  if (org?.city && org?.state) return { city: org.city, state: org.state, country: org.country || 'US' };
  if (hunter?.data?.organization) {
    // Hunter doesn't expose city/state in domain-search; leave empty
  }
  return { city: null, state: null, country: null };
}

async function main() {
  const { domain, source } = parseArgs();
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '').toLowerCase();
  console.log(`Enriching ${cleanDomain}...`);

  const [hunter, apollo, builtwith] = await Promise.all([
    hunterFind(cleanDomain),
    apolloFind(cleanDomain),
    builtwithCheck(cleanDomain),
  ]);

  const hunterBest = extractHunterBest(hunter);
  const apolloBest = extractApolloBest(apollo);
  const tech = detectAccountingTech(builtwith);

  const company = inferCompanyName(cleanDomain, hunter, apollo);
  const employees = inferEmployees(hunter, apollo);
  const loc = inferLocation(hunter, apollo);

  // Prefer Apollo email if available, otherwise Hunter
  const email = apolloBest.email_guess || hunterBest.email_guess || null;
  const emailStatus = apolloBest.email_guess
    ? apolloBest.confidence
    : hunterBest.email_status || 'guess';

  let icpFit = 'unknown';
  if (tech.has_qbo || tech.has_xero) icpFit = 'strong';
  else if (employees) {
    const n = parseInt(employees, 10);
    if (n >= 5 && n <= 50) icpFit = 'medium';
    else if (n > 50) icpFit = 'weak-size';
    else icpFit = 'weak-size';
  }

  const notes = [
    tech.has_qbo ? 'uses QuickBooks' : '',
    tech.has_xero ? 'uses Xero' : '',
    hunterBest.confidence?.startsWith?.('pattern:') ? `hunter pattern: ${hunterBest.confidence}` : '',
  ].filter(Boolean).join('; ') || null;

  const row = {
    id: uuid(),
    source,
    company,
    domain: cleanDomain,
    website: `https://${cleanDomain}`,
    city: loc.city,
    state: loc.state,
    country: loc.country,
    service: null,
    employees,
    employees_source: apollo ? 'apollo' : (hunter ? 'hunter_count' : null),
    decision_maker: apolloBest.decision_maker || null,
    role: apolloBest.role || null,
    linkedin_url: apolloBest.linkedin_url || null,
    email_guess: email,
    email_verified: 'no',
    email_status: emailStatus,
    confidence: apolloBest.confidence || hunterBest.confidence || null,
    signal: tech.has_qbo || tech.has_xero ? 'accounting_stack_match' : null,
    signal_source: builtwith ? 'builtwith' : null,
    icp_fit: icpFit,
    status: 'research',
    last_touch: null,
    next_touch: null,
    notes,
    created_at: today(),
  };

  const rowArray = HEADERS.map(h => row[h] ?? '');

  await ensureSheet(SHEET_NAME);
  await appendRows(`${SHEET_NAME}!A1`, [rowArray]);

  console.log('✓ Appended to sheet:');
  console.log(`  Company:    ${row.company}`);
  console.log(`  Domain:     ${row.domain}`);
  console.log(`  Contact:    ${row.decision_maker || '(none)'} ${row.role ? `(${row.role})` : ''}`);
  console.log(`  Email:      ${row.email_guess || '(none)'} [${row.email_status}]`);
  console.log(`  Employees:  ${row.employees || '(unknown)'}`);
  console.log(`  Location:   ${[row.city, row.state, row.country].filter(Boolean).join(', ') || '(unknown)'}`);
  console.log(`  ICP fit:    ${row.icp_fit}`);
  console.log(`  Signal:     ${row.signal || '(none)'}`);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
