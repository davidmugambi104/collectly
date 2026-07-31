import {
  getMeta,
  ensureSheet,
  readSheet,
  appendRows,
} from './sheets.mjs';

const SHEET_NAME = 'Prospects';
const HEADERS = [
  'id',
  'source',
  'company',
  'domain',
  'website',
  'city',
  'state',
  'country',
  'service',
  'employees',
  'employees_source',
  'decision_maker',
  'role',
  'linkedin_url',
  'email_guess',
  'email_verified',
  'email_status',
  'confidence',
  'signal',
  'signal_source',
  'icp_fit',
  'status',
  'last_touch',
  'next_touch',
  'notes',
  'created_at',
];

async function main() {
  console.log('Testing Google Sheets connection...');

  const meta = await getMeta();
  console.log('✓ Connected:', meta.properties.title);
  console.log('Existing tabs:', meta.sheets.map(s => s.properties.title).join(', ') || '(none)');

  await ensureSheet(SHEET_NAME);
  console.log(`✓ Tab "${SHEET_NAME}" ready`);

  const rows = await readSheet(`${SHEET_NAME}!A1:Z2`);
  if (rows.length === 0) {
    console.log('Sheet is empty. Adding header row...');
    await appendRows(`${SHEET_NAME}!A1`, [HEADERS]);
    console.log('✓ Header row added');
  } else if (rows[0][0] !== 'id') {
    console.log('First row exists but is not our header. Skipping header write to avoid overwrite.');
    console.log('First row:', rows[0]);
  } else {
    console.log('✓ Header row already exists');
    console.log(`Found ${rows.length - 1} data row(s)`);
  }

  console.log('Test complete.');
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
