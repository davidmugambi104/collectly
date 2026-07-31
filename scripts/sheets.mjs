/**
 * Google Sheets bridge for Collectly prospect pipeline.
 * Reads/writes prospect rows using a service account.
 */
import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

// Load .env.local manually so this script works outside Next.js runtime
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

const REQUIRED = [
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_SHEET_ID',
];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in .env.local`);
    process.exit(1);
  }
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CREDS_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (!fs.existsSync(CREDS_PATH)) {
  console.error(`Service account credentials not found at ${CREDS_PATH}`);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: CREDS_PATH,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Read all values from a sheet tab.
 * @param {string} range - e.g. "Prospects!A1:Z"
 */
export async function readSheet(range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  return res.data.values || [];
}

/**
 * Append rows to a sheet tab.
 * @param {string} range - e.g. "Prospects!A1"
 * @param {string[][]} rows
 */
export async function appendRows(range, rows) {
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
  return res.data;
}

/**
 * Update a specific cell range.
 * @param {string} range - e.g. "Prospects!A2"
 * @param {string[][]} values
 */
export async function updateRange(range, values) {
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
  return res.data;
}

/**
 * Get sheet metadata (tabs, titles).
 */
export async function getMeta() {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  return res.data;
}

/**
 * Ensure a tab exists; create it if missing.
 * @param {string} title
 */
export async function ensureSheet(title) {
  const meta = await getMeta();
  const exists = meta.sheets.some(s => s.properties.title === title);
  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        { addSheet: { properties: { title } } },
      ],
    },
  });
}

export async function deleteRows(sheetTitle, startIndex, endIndex) {
  const meta = await getMeta();
  const sheet = meta.sheets.find(s => s.properties.title === sheetTitle);
  if (!sheet) throw new Error(`Sheet tab "${sheetTitle}" not found`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex,
            },
          },
        },
      ],
    },
  });
}

// CLI helpers
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  if (cmd === 'meta') {
    const meta = await getMeta();
    console.log(JSON.stringify(meta.properties, null, 2));
    console.log('Sheets:', meta.sheets.map(s => s.properties.title).join(', '));
  } else if (cmd === 'read') {
    const range = process.argv[3] || 'Prospects!A1:Z';
    const rows = await readSheet(range);
    console.table(rows);
  } else if (cmd === 'test') {
    const meta = await getMeta();
    console.log('Connected to:', meta.properties.title);
    console.log('Sheets:', meta.sheets.map(s => s.properties.title).join(', '));
  } else if (cmd === 'delete-row') {
    const title = process.argv[3] || 'Prospects';
    const row = parseInt(process.argv[4], 10);
    if (!row || row < 1) {
      console.error('Usage: node scripts/sheets.mjs delete-row [sheet-title] <1-based-row>');
      process.exit(1);
    }
    await deleteRows(title, row - 1, row);
    console.log(`Deleted row ${row} from "${title}"`);
  } else {
    console.log('Usage: node scripts/sheets.mjs [meta|read <range>|test]');
  }
}
