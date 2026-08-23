#!/usr/bin/env node
/**
 * Collectly Apify lead-list builder.
 *
 * Scrapes Google Maps for B2B service businesses (agencies, bookkeepers,
 * consultancies) and outputs a prospects CSV ready for enrichment.
 *
 * Usage:
 *   node outreach/scripts/apify_build_list.js \
 *     --city "Austin" \
 *     --country US \
 *     --profession "marketing agency" \
 *     --limit 50 \
 *     --output outreach/data/apify-2026-08-04-austin-marketing.csv
 *
 * Requires APIFY_TOKEN in environment or in
 * /home/user/.openclaw/secrets/collectly/APIFY_CREDS
 */

const { parseArgs } = require('node:util');
const { writeFileSync, existsSync, readFileSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const {
  getToken,
  startActor,
  pollUntilComplete,
  downloadResults,
  saveJson,
} = require('./lib/apify_runner');

const ACTOR_ID = 'compass/crawler-google-places';
const DEFAULT_LIMIT = 50;
const DEFAULT_TIMEOUT = 600;

const PROSPECT_CSV_HEADER = [
  'id',
  'first_name',
  'last_name',
  'company',
  'role',
  'country',
  'team_size',
  'industry',
  'linkedin_url',
  'email',
  'source',
  'notes',
  'hook',
  'tier',
].join(',');

function printHelp() {
  console.log(`
Collectly Apify lead-list builder

Usage:
  node outreach/scripts/apify_build_list.js [options]

Options:
  --city, -c          City to search (required)
  --country, -C       ISO country code: US, GB, AU, CA, etc. (default: US)
  --profession, -p    Search term, e.g. "marketing agency", "bookkeeper", "IT consultant" (required)
  --industry, -i      Industry label for the CSV (default: derived from profession)
  --limit, -l         Max results to keep after filtering/dedup (default: ${DEFAULT_LIMIT})
  --output, -o        Output CSV path (default: outreach/data/apify-YYYY-MM-DD-{city}-{profession}.csv)
  --raw, -r           Also save raw Apify JSON to this path
  --timeout, -t       Max seconds to wait for Apify run (default: ${DEFAULT_TIMEOUT})
  --help, -h          Show this help

Examples:
  node outreach/scripts/apify_build_list.js -c "Manchester" -C GB -p "branding agency" -l 30
  node outreach/scripts/apify_build_list.js -c "Phoenix" -C US -p "bookkeeping" -l 50
`);
}

function parseCliArgs() {
  const options = {
    city: { type: 'string', short: 'c' },
    country: { type: 'string', short: 'C', default: 'US' },
    profession: { type: 'string', short: 'p' },
    industry: { type: 'string', short: 'i' },
    limit: { type: 'string', short: 'l', default: String(DEFAULT_LIMIT) },
    output: { type: 'string', short: 'o' },
    raw: { type: 'string', short: 'r' },
    timeout: { type: 'string', short: 't', default: String(DEFAULT_TIMEOUT) },
    help: { type: 'boolean', short: 'h' },
  };

  const { values } = parseArgs({ options, allowPositionals: false });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (!values.city || !values.profession) {
    console.error('Error: --city and --profession are required');
    printHelp();
    process.exit(1);
  }

  const limit = parseInt(values.limit, 10);
  if (Number.isNaN(limit) || limit < 1 || limit > 5000) {
    console.error('Error: --limit must be between 1 and 5000');
    process.exit(1);
  }

  const timeout = parseInt(values.timeout, 10);
  if (Number.isNaN(timeout) || timeout < 10) {
    console.error('Error: --timeout must be at least 10 seconds');
    process.exit(1);
  }

  return {
    city: values.city,
    country: values.country.toUpperCase(),
    profession: values.profession,
    industry: values.industry || values.profession.split(' ')[0],
    limit,
    timeout,
    output: values.output,
    raw: values.raw,
  };
}

function deriveOutputPath(args) {
  const slug = `${args.city}-${args.profession}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const date = new Date().toISOString().split('T')[0];
  return resolve(
    process.cwd(),
    'outreach/data',
    `apify-${date}-${slug}.csv`
  );
}

function extractDomain(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function buildLocationQuery(city, country) {
  const countryNames = {
    US: 'USA',
    GB: 'UK',
    AU: 'Australia',
    CA: 'Canada',
    IE: 'Ireland',
    NZ: 'New Zealand',
  };
  const countryName = countryNames[country] || country;
  return `${city}, ${countryName}`;
}

function buildNotes(item) {
  const parts = [];
  if (item.website) parts.push(`website=${item.website}`);
  if (item.phone) parts.push(`phone=${item.phone}`);
  if (item.address) parts.push(`address=${item.address}`);
  if (item.totalScore != null) parts.push(`rating=${item.totalScore}`);
  if (item.reviewsCount != null) parts.push(`reviews=${item.reviewsCount}`);
  if (item.categories?.length) parts.push(`categories=${item.categories.join(';')}`);
  if (item.permanentlyClosed) parts.push('CLOSED');
  return parts.join(' | ');
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (str.includes(',') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(rows) {
  const lines = [PROSPECT_CSV_HEADER];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.first_name,
        row.last_name,
        row.company,
        row.role,
        row.country,
        row.team_size,
        row.industry,
        row.linkedin_url,
        row.email,
        row.source,
        row.notes,
        row.hook,
        row.tier,
      ]
        .map(csvEscape)
        .join(',')
    );
  }
  return lines.join('\n');
}

async function main() {
  const args = parseCliArgs();
  const outputPath = args.output
    ? resolve(process.cwd(), args.output)
    : deriveOutputPath(args);

  // Ensure output directory exists
  const outDir = dirname(outputPath);
  if (!existsSync(outDir)) {
    throw new Error(`Output directory does not exist: ${outDir}`);
  }

  // Load token from secrets file if not in env
  if (!process.env.APIFY_TOKEN && !process.env.APIFY_API_TOKEN) {
    const secretsPath = '/home/user/.openclaw/secrets/collectly/APIFY_CREDS';
    if (existsSync(secretsPath)) {
      const content = readFileSync(secretsPath, 'utf-8');
      const match = content.match(/APIFY_API_TOKEN=([^\s]+)/);
      if (match) process.env.APIFY_TOKEN = match[1];
    }
  }

  const token = getToken();
  console.log(`Building list: "${args.profession}" in ${args.city}, ${args.country}`);
  console.log(`Target: ${args.limit} unique prospects with websites`);

  const locationQuery = buildLocationQuery(args.city, args.country);
  const apifyInput = {
    searchStringsArray: [args.profession],
    locationQuery,
    // Disable expensive add-ons to keep cost low
    includeReviews: false,
    includeImages: false,
    // Try to keep runs small; Apify may return more than this
    maxCrawledPlaces: args.limit * 4,
  };

  const { runId, datasetId, actorRunUrl } = await startActor(token, ACTOR_ID, apifyInput);
  console.log(`Apify run started: ${actorRunUrl}`);

  const { status, charge } = await pollUntilComplete(token, runId, args.timeout);
  if (status !== 'SUCCEEDED') {
    console.error(`Apify run ended with status: ${status}`);
    process.exit(1);
  }

  console.log(`Apify run succeeded. Charge: $${charge ?? 'unknown'}`);

  const allResults = await downloadResults(token, datasetId);
  console.log(`Downloaded ${allResults.length} raw records`);

  if (args.raw) {
    const rawPath = resolve(process.cwd(), args.raw);
    saveJson(rawPath, allResults);
    console.log(`Raw JSON saved: ${rawPath}`);
  }

  // Filter and dedup
  const seenDomains = new Set();
  const rows = [];
  let skippedNoWebsite = 0;
  let skippedClosed = 0;
  let skippedDup = 0;

  for (const item of allResults) {
    if (rows.length >= args.limit) break;

    if (item.permanentlyClosed || item.temporarilyClosed) {
      skippedClosed++;
      continue;
    }

    const website = item.website || item.url;
    if (!website) {
      skippedNoWebsite++;
      continue;
    }

    const domain = extractDomain(website);
    if (!domain || seenDomains.has(domain)) {
      skippedDup++;
      continue;
    }
    seenDomains.add(domain);

    rows.push({
      id: `A${String(rows.length + 1).padStart(3, '0')}`,
      first_name: '',
      last_name: '',
      company: item.title || '',
      role: '',
      country: args.country,
      team_size: '',
      industry: args.industry,
      linkedin_url: '',
      email: '',
      source: `apify_google_maps_${args.city}_${args.profession}`.toLowerCase().replace(/\s+/g, '_'),
      notes: buildNotes(item),
      hook: '',
      tier: '2',
    });
  }

  writeFileSync(outputPath, rowsToCsv(rows));
  console.log(`\nDone.`);
  console.log(`  Kept:        ${rows.length} prospects`);
  console.log(`  Skipped:     ${skippedNoWebsite} no website | ${skippedClosed} closed | ${skippedDup} duplicate`);
  console.log(`  Output:      ${outputPath}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Enrich with Hunter.io/Apollo: node outreach/scripts/enrich_pipeline.js ${outputPath}`);
  console.log(`  2. Review and move validated leads to outreach/data/prospects.csv`);
  console.log(`  3. Do NOT email these until deliverability is confirmed.`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
