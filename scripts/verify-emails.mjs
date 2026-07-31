/**
 * Batch verify emails in the Google Sheet using ZeroBounce.
 *
 * Usage:
 *   node scripts/verify-emails.mjs              # verify all unverified rows
 *   node scripts/verify-emails.mjs --limit=10   # verify first 10 unverified rows
 *   node scripts/verify-emails.mjs --dry-run    # show what would be verified
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSheet, updateRange } from './sheets.mjs';

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

function parseArgs() {
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
  const dryRun = process.argv.includes('--dry-run');
  return { limit, dryRun };
}

async function verifyEmail(email) {
  const key = process.env.ZEROBOUNCE_API_KEY;
  if (!key) throw new Error('ZEROBOUNCE_API_KEY missing');
  const url = `https://api.zerobounce.net/v2/validate?api_key=${key}&email=${encodeURIComponent(email)}&ip_address=`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ZeroBounce ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

function safeSendDecision(status, subStatus, catchAll) {
  // Statuses: valid, invalid, catch-all, unknown, spamtrap, abuse, do_not_mail, disposable
  if (status === 'valid') return 'send';
  if (status === 'catch-all') return 'review';
  if (status === 'unknown') return 'review';
  if (status === 'invalid') return 'skip';
  if (['spamtrap', 'abuse', 'do_not_mail', 'disposable'].includes(status)) return 'skip';
  return 'review';
}

async function main() {
  const { limit, dryRun } = parseArgs();

  console.log('Reading sheet...');
  const rows = await readSheet(`${SHEET_NAME}!A1:Z`);
  if (rows.length === 0) {
    console.log('Sheet is empty.');
    return;
  }

  const headers = rows[0];
  const data = rows.slice(1);
  const emailCol = headers.indexOf('email_guess');
  const verifiedCol = headers.indexOf('email_verified');
  const statusCol = headers.indexOf('email_status');
  const notesCol = headers.indexOf('notes');

  if (emailCol === -1 || verifiedCol === -1 || statusCol === -1) {
    console.error('Required columns not found in sheet header.');
    process.exit(1);
  }

  const candidates = data
    .map((row, idx) => ({ row, idx: idx + 2, email: row[emailCol] }))
    .filter(({ email }) => email && email.includes('@'));

  const unverified = candidates.filter(({ row }) =>
    !row[verifiedCol] || row[verifiedCol].toLowerCase() !== 'yes'
  );

  const toVerify = unverified.slice(0, limit);

  console.log(`Found ${candidates.length} rows with emails, ${unverified.length} unverified, processing ${toVerify.length}`);

  if (dryRun) {
    for (const { email, idx } of toVerify) {
      console.log(`Would verify row ${idx}: ${email}`);
    }
    return;
  }

  for (const { row, idx, email } of toVerify) {
    try {
      console.log(`Verifying row ${idx}: ${email}...`);
      const result = await verifyEmail(email);
      const sendDecision = safeSendDecision(result.status, result.sub_status, result.catch_all);

      const newVerified = result.status === 'valid' ? 'yes' : 'no';
      const newStatus = `${result.status}${result.sub_status ? `/${result.sub_status}` : ''} → ${sendDecision}`;

      const existingNotes = row[notesCol] || '';
      const extra = [
        result.catch_all ? 'catch-all domain' : '',
        result.firstname ? `name: ${result.firstname} ${result.lastname || ''}`.trim() : '',
      ].filter(Boolean).join('; ');
      const newNotes = [existingNotes, extra].filter(Boolean).join('; ');

      const updates = [];
      updates.push({ col: verifiedCol, val: newVerified });
      updates.push({ col: statusCol, val: newStatus });
      if (notesCol !== -1) updates.push({ col: notesCol, val: newNotes });

      for (const { col, val } of updates) {
        const range = `${SHEET_NAME}!${colToLetter(col)}${idx}`;
        await updateRange(range, [[val]]);
      }

      console.log(`  → ${newStatus}`);

      // Respect free-tier rate limits
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`  Failed row ${idx} (${email}):`, err.message);
    }
  }

  console.log('Done.');
}

function colToLetter(n) {
  let s = '';
  n += 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
